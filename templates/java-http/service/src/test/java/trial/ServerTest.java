package trial;

import com.sun.net.httpserver.HttpServer;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ServerTest {
    @Test void realHttpReadinessIdentityAndGreeting() throws Exception {
        String commit = "a".repeat(40);
        HttpServer server = Server.start(0, commit);
        try (HttpClient client = HttpClient.newHttpClient()) {
            String base = "http://127.0.0.1:" + server.getAddress().getPort();
            for (String route : new String[]{"/healthz", "/version", "/"}) {
                var response = client.send(HttpRequest.newBuilder(URI.create(base + route)).GET().build(), HttpResponse.BodyHandlers.ofString());
                assertEquals(200, response.statusCode());
                assertEquals("application/json; charset=utf-8", response.headers().firstValue("Content-Type").orElseThrow());
                if (route.equals("/healthz")) assertEquals("{\"status\":\"ok\"}", response.body());
                if (route.equals("/version")) assertEquals("{\"name\":\"independent-java\",\"buildCommit\":\"" + commit + "\"}", response.body());
                if (route.equals("/")) assertEquals(Files.readString(Path.of("src/test/resources/greeting.json")).trim(), response.body());
            }
            assertEquals(404, client.send(HttpRequest.newBuilder(URI.create(base + "/missing")).GET().build(), HttpResponse.BodyHandlers.ofString()).statusCode());
            assertEquals(405, client.send(HttpRequest.newBuilder(URI.create(base)).POST(HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString()).statusCode());
        } finally { server.stop(0); }
    }
    @Test void rejectsMissingBuildIdentity() {
        assertThrows(IllegalArgumentException.class, () -> Server.start(0, "unknown"));
    }
}
