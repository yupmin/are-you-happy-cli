import { readFileSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Ctx } from "../src/context";
import type { Io } from "../src/io";
import { en } from "../src/locales/en";
import { Output } from "../src/output";
import {
  createHttpTokenIssuer,
  parseHttpBaseUrl,
  tokenEndpoint,
} from "../src/services/http-token-issuer";
import { getAccessToken } from "../src/services/token-flow";
import { ApiError } from "../src/services/token-issuer";
import { ConfigFileStore } from "../src/settings/config-file";
import { DotenvStore } from "../src/settings/dotenv";
import type { Settings } from "../src/settings/resolve";
import type { StoreEnv } from "../src/settings/store";
import { type TokenState, TokenStateStore } from "../src/settings/token-state";
import { run, tempDir } from "./helpers";

const SECRET = "happy-secret";
const REFRESH = "refresh-from-server";

interface Hit {
  path: string;
  body: string;
}

function serve(
  handle: (hit: Hit) => { status: number; body?: string; hang?: boolean } | Promise<never>,
) {
  const hits: Hit[] = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const hit = { path: req.url ?? "", body: Buffer.concat(chunks).toString("utf8") };
      hits.push(hit);
      void Promise.resolve(handle(hit)).then((result) => {
        if (!result || result.hang) return;
        res.statusCode = result.status;
        res.setHeader("content-type", "application/json");
        res.end(result.body ?? "");
      });
    });
  });
  return new Promise<{ url: string; hits: Hit[]; close: () => Promise<void> }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        url: `http://127.0.0.1:${port}`,
        hits,
        close: () =>
          new Promise((done, reject) => {
            server.closeAllConnections();
            server.close((err) => (err ? reject(err) : done()));
          }),
      });
    });
  });
}

const grant = (access: string, refresh = REFRESH, expires = 3600) =>
  JSON.stringify({
    access_token: access,
    refresh_token: refresh,
    expires_in: expires,
    token_type: "bearer",
  });

describe("parseHttpBaseUrl", () => {
  it("joins the token path and drops query and hash", () => {
    const base = parseHttpBaseUrl("https://example.com/api/?q=1#x");
    expect(base).not.toBeNull();
    expect(tokenEndpoint(base as URL)).toBe("https://example.com/api/oauth/token");
  });

  it("rejects userinfo and non-http schemes", () => {
    expect(parseHttpBaseUrl("https://user:secret@example.com")).toBeNull();
    expect(parseHttpBaseUrl("ftp://example.com")).toBeNull();
    expect(parseHttpBaseUrl("example.com")).toBeNull();
  });
});

describe("HTTP TokenIssuer", () => {
  it("issues with client_credentials and refreshes with refresh_token", async () => {
    const server = await serve((hit) => {
      const form = new URLSearchParams(hit.body);
      if (form.get("grant_type") === "refresh_token") {
        return { status: 200, body: grant("access-2", "refresh-2", 120) };
      }
      return { status: 200, body: grant("access-1") };
    });
    try {
      const issuer = createHttpTokenIssuer({
        baseUrl: server.url,
        clientId: "happy-client",
        clientSecret: SECRET,
      });
      const issued = await issuer.issueToken({ clientId: "happy-client", clientSecret: SECRET });
      expect(issued).toEqual({ accessToken: "access-1", refreshToken: REFRESH, expiresIn: 3600 });
      const refreshed = await issuer.refreshAccessToken(REFRESH);
      expect(refreshed.accessToken).toBe("access-2");
      expect(refreshed.refreshToken).toBe("refresh-2");
      const issue = new URLSearchParams(server.hits[0]?.body);
      const refresh = new URLSearchParams(server.hits[1]?.body);
      expect(server.hits[0]?.path).toBe("/oauth/token");
      expect(issue.get("grant_type")).toBe("client_credentials");
      expect(issue.get("client_secret")).toBe(SECRET);
      expect(refresh.get("grant_type")).toBe("refresh_token");
      expect(refresh.get("refresh_token")).toBe(REFRESH);
      expect(refresh.get("client_secret")).toBe(SECRET);
    } finally {
      await server.close();
    }
  });

  it("keeps the sent refresh token when the body omits one", async () => {
    const server = await serve(() => ({
      status: 200,
      body: JSON.stringify({ access_token: "access-2", expires_in: 60 }),
    }));
    try {
      const issuer = createHttpTokenIssuer({ baseUrl: server.url });
      const refreshed = await issuer.refreshAccessToken("keep-me");
      expect(refreshed).toEqual({
        accessToken: "access-2",
        refreshToken: "keep-me",
        expiresIn: 60,
      });
      expect(new URLSearchParams(server.hits[0]?.body).has("client_secret")).toBe(false);
    } finally {
      await server.close();
    }
  });

  it.each([
    ["401", 401, "nope"],
    ["5xx", 503, SECRET],
  ])(
    "%s becomes ApiError with that status and no body in the message",
    async (_label, status, leak) => {
      const server = await serve(() => ({ status, body: leak }));
      try {
        const issuer = createHttpTokenIssuer({ baseUrl: server.url });
        const err = await issuer
          .issueToken({ clientId: "happy-client", clientSecret: SECRET })
          .then(
            () => undefined,
            (caught: unknown) => caught,
          );
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(status);
        expect((err as ApiError).message).toBe(`API responded ${status}`);
        expect(String(err)).not.toContain(SECRET);
        expect(String(err)).not.toContain(leak);
      } finally {
        await server.close();
      }
    },
  );

  it("malformed JSON and a short grant are 502", async () => {
    const badJson = await serve(() => ({ status: 200, body: "not-json" }));
    const short = await serve(() => ({
      status: 200,
      body: JSON.stringify({ access_token: "only" }),
    }));
    try {
      await expect(
        createHttpTokenIssuer({ baseUrl: badJson.url }).issueToken({
          clientId: "id",
          clientSecret: SECRET,
        }),
      ).rejects.toMatchObject({ status: 502 });
      await expect(
        createHttpTokenIssuer({ baseUrl: short.url }).issueToken({
          clientId: "id",
          clientSecret: SECRET,
        }),
      ).rejects.toMatchObject({ status: 502, message: "API responded 502" });
    } finally {
      await badJson.close();
      await short.close();
    }
  });

  it("times out as 504 without the secret", async () => {
    const server = await serve(() => new Promise(() => {}) as Promise<never>);
    try {
      const issuer = createHttpTokenIssuer({ baseUrl: server.url, timeoutMs: 30 });
      const err = await issuer.issueToken({ clientId: "happy-client", clientSecret: SECRET }).then(
        () => undefined,
        (caught: unknown) => caught,
      );
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(504);
      expect(String(err)).not.toContain(SECRET);
    } finally {
      await server.close();
    }
  });

  it("a closed port is 503", async () => {
    const server = await serve(() => ({ status: 200, body: grant("x") }));
    const url = server.url;
    await server.close();
    const issuer = createHttpTokenIssuer({ baseUrl: url, timeoutMs: 1000 });
    await expect(
      issuer.issueToken({ clientId: "happy-client", clientSecret: SECRET }),
    ).rejects.toMatchObject({ status: 503, message: "API responded 503" });
  });
});

describe("token flow through the HTTP adapter", () => {
  it("auth issue-token stores the HTTP grant and does not print the secret", async () => {
    const server = await serve(() => ({
      status: 200,
      body: grant("from-http", "from-http-refresh"),
    }));
    const home = tempDir();
    const cwd = tempDir();
    writeFileSync(
      join(cwd, ".env"),
      `ARE_YOU_HAPPY_CLI_CLIENT_ID=happy-client\nARE_YOU_HAPPY_CLI_CLIENT_SECRET=${SECRET}\n`,
      { mode: 0o600 },
    );
    try {
      const r = await run(["--verbose", "auth", "issue-token"], {
        home,
        cwd,
        env: { ARE_YOU_HAPPY_CLI_API_URL: server.url },
      });
      expect(r.exitCode).toBe(0);
      expect(r.stdout + r.stderr).not.toContain(SECRET);
      const saved = JSON.parse(
        readFileSync(join(home, ".are-you-happy-cli", "token-dir", "token.json"), "utf8"),
      ) as TokenState;
      expect(saved).toMatchObject({
        accessToken: "from-http",
        refreshToken: "from-http-refresh",
        clientId: "happy-client",
      });
    } finally {
      await server.close();
    }
  });

  it("getAccessToken refreshes an expired Token State through HTTP", async () => {
    const server = await serve((hit) => {
      const form = new URLSearchParams(hit.body);
      if (form.get("grant_type") === "refresh_token") {
        return { status: 200, body: grant("refreshed-access", "refreshed-refresh", 60) };
      }
      return { status: 500, body: SECRET };
    });
    try {
      const issuer = createHttpTokenIssuer({
        baseUrl: server.url,
        clientId: "happy-client",
        clientSecret: SECRET,
      });
      const h = flow(issuer);
      await expect(getAccessToken(h.ctx)).resolves.toBe("refreshed-access");
      expect(h.saved().refreshToken).toBe("refreshed-refresh");
      expect(h.stderr()).toContain(en.token.refreshed);
      expect(h.stderr()).not.toContain(SECRET);
      expect(new URLSearchParams(server.hits[0]?.body).get("grant_type")).toBe("refresh_token");
    } finally {
      await server.close();
    }
  });

  it("issue-token maps HTTP 401 to exit 3 and hides the response body", async () => {
    const server = await serve(() => ({ status: 401, body: SECRET }));
    const cwd = tempDir();
    writeFileSync(
      join(cwd, ".env"),
      `ARE_YOU_HAPPY_CLI_CLIENT_ID=happy-client\nARE_YOU_HAPPY_CLI_CLIENT_SECRET=${SECRET}\n`,
      { mode: 0o600 },
    );
    try {
      const r = await run(["--verbose", "auth", "issue-token"], {
        cwd,
        env: { ARE_YOU_HAPPY_CLI_API_URL: server.url },
      });
      expect(r.exitCode).toBe(3);
      expect(r.stdout + r.stderr).not.toContain(SECRET);
    } finally {
      await server.close();
    }
  });

  it("a 5xx on issue is credentials_rejected with that status", async () => {
    const server = await serve(() => ({ status: 503, body: "leak-body" }));
    const home = tempDir();
    const cwd = tempDir();
    await run(["config", "init", "--lang", "en", "--timezone", "UTC"], { home, cwd });
    writeFileSync(
      join(cwd, ".env"),
      `ARE_YOU_HAPPY_CLI_CLIENT_ID=happy-client\nARE_YOU_HAPPY_CLI_CLIENT_SECRET=${SECRET}\n`,
      { mode: 0o600 },
    );
    try {
      const r = await run(["--verbose", "action", "are-you", "Minsu"], {
        home,
        cwd,
        env: { ARE_YOU_HAPPY_CLI_API_URL: server.url },
      });
      expect(r.exitCode).toBe(1);
      expect(r.json()).toMatchObject({ code: 503, reason: "credentials_rejected" });
      expect(r.stdout + r.stderr).not.toContain("leak-body");
      expect(r.stdout + r.stderr).not.toContain(SECRET);
    } finally {
      await server.close();
    }
  });
});

describe("API_URL", () => {
  it("an unusable URL is 400 and the value is not echoed", async () => {
    const secretUrl = "https://user:supersecret@example.com/token";
    const r = await run(["action", "are-you", "Minsu"], {
      env: { ARE_YOU_HAPPY_CLI_API_URL: secretUrl },
    });
    expect(r.exitCode).toBe(2);
    expect(r.json()).toMatchObject({ code: 400, reason: "invalid_api_url" });
    expect(r.stdout + r.stderr).not.toContain("supersecret");
    expect(r.stdout + r.stderr).not.toContain(secretUrl);
  });

  it("config show prints a usable API_URL", async () => {
    const r = await run(["config", "show"], {
      env: { ARE_YOU_HAPPY_CLI_API_URL: "https://example.com/api" },
    });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("ARE_YOU_HAPPY_CLI_API_URL");
    expect(r.stdout).toContain("https://example.com/api");
  });
});

const EXPIRES = "2026-11-22T15:10:00.000Z";

function flow(issuer: Ctx["issuer"]) {
  const home = tempDir();
  const cwd = tempDir();
  const configDir = join(home, ".are-you-happy-cli");
  const tokenFile = join(configDir, "token-dir", "token.json");
  let stderr = "";
  const io: Io = {
    env: {},
    cwd,
    homedir: home,
    stdout: { write: () => {}, isTTY: false },
    stderr: {
      write: (chunk) => {
        stderr += chunk;
      },
      isTTY: false,
    },
    interactive: false,
    prompt: {
      input: async () => "",
      password: async () => "",
      select: async () => "" as never,
      confirm: async () => false,
    },
    now: () => new Date(EXPIRES),
    random: () => 0,
    systemTimeZone: () => "Asia/Seoul",
  };
  const out = new Output(io, "text", en.label);
  const env: StoreEnv = () => ({ t: en, warn: (message) => out.warn(message) });
  writeFileSync(
    join(cwd, ".env"),
    `ARE_YOU_HAPPY_CLI_CLIENT_ID=happy-client\nARE_YOU_HAPPY_CLI_CLIENT_SECRET=${SECRET}\n`,
    { mode: 0o600 },
  );
  const settings = {
    LANG: undefined,
    TIMEZONE: undefined,
    CLIENT_ID: { value: "happy-client", source: ".env" },
    CLIENT_SECRET: { value: SECRET, source: ".env" },
    API_URL: undefined,
  } as Settings;
  const tokenState = new TokenStateStore(tokenFile, [configDir, join(configDir, "token-dir")], env);
  tokenState.save({
    accessToken: "old-access",
    refreshToken: "old-refresh",
    expiresAt: EXPIRES,
    clientId: "happy-client",
  });
  const ctx: Ctx = {
    io,
    t: en,
    lang: "en",
    out,
    settings,
    config: new ConfigFileStore(join(configDir, "config.json"), configDir, env),
    dotenv: new DotenvStore(join(cwd, ".env"), env),
    tokenState,
    timezone: "Asia/Seoul",
    issuer,
  };
  return {
    ctx,
    stderr: () => stderr,
    saved: () => JSON.parse(readFileSync(tokenFile, "utf8")) as TokenState,
  };
}
