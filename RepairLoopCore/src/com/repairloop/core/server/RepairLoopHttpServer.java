package com.repairloop.core.server;

import com.repairloop.core.model.DecisionInput;
import com.repairloop.core.model.DecisionResult;
import com.repairloop.core.service.RepairDecisionEngine;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lightweight built-in Java 21 HTTP server (no Spring Boot, zero external libraries)
 * exposing the RepairDecisionEngine over a REST-style JSON API on port 8080.
 */
public class RepairLoopHttpServer {
    private static final int DEFAULT_PORT = 8080;
    private static final RepairDecisionEngine ENGINE = new RepairDecisionEngine();

    public static void main(String[] args) throws IOException {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : DEFAULT_PORT;
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);

        server.createContext("/api/health", exchange -> {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            sendJson(exchange, 200, "{\"status\":\"UP\",\"module\":\"RepairLoopCore\",\"javaVersion\":\""
                    + System.getProperty("java.version") + "\"}");
        });

        server.createContext("/api/decision/evaluate", exchange -> {
            addCorsHeaders(exchange);
            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                sendJson(exchange, 405, "{\"error\":\"Method not allowed. Use POST.\"}");
                return;
            }
            try (InputStream is = exchange.getRequestBody()) {
                String body = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                DecisionInput input = parseDecisionInput(body);
                DecisionResult result = ENGINE.evaluate(input);
                sendJson(exchange, 200, serializeDecisionResult(result));
            } catch (Exception ex) {
                sendJson(exchange, 400, "{\"error\":\"" + escapeJson(ex.getMessage()) + "\"}");
            }
        });

        server.setExecutor(null);
        server.start();
        System.out.println("RepairLoopCore HTTP Server listening on http://localhost:" + port);
        System.out.println("  GET  /api/health");
        System.out.println("  POST /api/decision/evaluate");
    }

    private static DecisionInput parseDecisionInput(String json) {
        double originalPrice = extractDouble(json, "originalPrice");
        double productAgeYears = extractDouble(json, "productAgeYears");
        double repairCost = extractDouble(json, "repairCost");
        double replacementCost = extractDouble(json, "replacementCost");
        int previousRepairCount = (int) Math.round(extractDouble(json, "previousRepairCount"));
        double previousRepairCost = extractDouble(json, "previousRepairCost");
        double additionalLifespan = extractDouble(json, "estimatedAdditionalLifespanYears");
        boolean recurringFault = extractBoolean(json, "recurringFault");

        return new DecisionInput(
                originalPrice,
                productAgeYears,
                repairCost,
                replacementCost,
                previousRepairCount,
                previousRepairCost,
                additionalLifespan,
                recurringFault);
    }

    private static double extractDouble(String json, String key) {
        Pattern p = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)");
        Matcher m = p.matcher(json);
        if (!m.find()) {
            throw new IllegalArgumentException("Missing or invalid numeric field: " + key);
        }
        return Double.parseDouble(m.group(1));
    }

    private static boolean extractBoolean(String json, String key) {
        Pattern p = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*(true|false)");
        Matcher m = p.matcher(json);
        if (!m.find()) {
            throw new IllegalArgumentException("Missing or invalid boolean field: " + key);
        }
        return Boolean.parseBoolean(m.group(1));
    }

    private static String serializeDecisionResult(DecisionResult r) {
        StringBuilder breakdownJson = new StringBuilder("{");
        int i = 0;
        for (Map.Entry<String, Double> entry : r.getFactorRepairPoints().entrySet()) {
            if (i++ > 0) breakdownJson.append(",");
            breakdownJson.append("\"").append(entry.getKey()).append("\":").append(entry.getValue());
        }
        breakdownJson.append("}");

        return String.format(
                "{\"engine\":\"Java21-RepairLoopCore\",\"repairScore\":%d,\"replacementScore\":%d,"
                        + "\"repairCostRatio\":%.2f,\"repairCostPercentage\":%.2f,\"estimatedSavings\":%.2f,"
                        + "\"additionalLifespanYears\":%.2f,\"recommendation\":\"%s\",\"explanation\":\"%s\","
                        + "\"factorBreakdown\":%s}",
                r.getRepairScore(),
                r.getReplacementScore(),
                r.getRepairCostRatio(),
                r.getRepairCostPercentage(),
                r.getEstimatedSavings(),
                r.getAdditionalLifespanYears(),
                r.getRecommendation().name(),
                escapeJson(r.getExplanation()),
                breakdownJson);
    }

    private static void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    }

    private static void sendJson(HttpExchange exchange, int statusCode, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static String escapeJson(String input) {
        if (input == null) return "";
        return input.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
    }
}
