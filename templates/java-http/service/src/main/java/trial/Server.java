package trial;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

/** One small standard-library service, independent of the delivery engine. */
public final class Server {
    private Server() {}

    public static HttpServer start(int port, String commit) throws IOException {
        if (!commit.matches("[a-f0-9]{40}")) throw new IllegalArgumentException("BUILD_COMMIT must be an exact Git SHA");
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 16);
        server.createContext("/", exchange -> {
            String body;
            int status = 200;
            if (!exchange.getRequestMethod().equals("GET")) {
                status = 405;
                body = "{\"error\":\"method not allowed\"}";
            } else {
                switch (exchange.getRequestURI().getPath()) {
                    case "/healthz" -> body = "{\"status\":\"ok\"}";
                    case "/version" -> body = "{\"name\":\"independent-java\",\"buildCommit\":\"" + commit + "\"}";
                    case "/" -> body = "{\"message\":\"Hello from the independent Java consumer\"}";
                    default -> { status = 404; body = "{\"error\":\"not found\"}"; }
                }
            }
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
            exchange.sendResponseHeaders(status, bytes.length);
            try (var output = exchange.getResponseBody()) { output.write(bytes); }
            exchange.close();
        });
        server.start(); // /healthz is served only by the running listener.
        return server;
    }

    public static void main(String[] args) throws IOException {
        HttpServer server = start(3000, System.getenv().getOrDefault("BUILD_COMMIT", "unknown"));
        Runtime.getRuntime().addShutdownHook(new Thread(() -> server.stop(0)));
    }
}
