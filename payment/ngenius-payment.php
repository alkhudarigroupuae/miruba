<?php
error_reporting(E_ALL);
ini_set("display_errors", 0);
header("Content-Type: application/json");

$configPath = __DIR__ . "/config.php";
if (!file_exists($configPath)) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Missing payment config"]);
    exit;
}
$config = require $configPath;

$baseUrl = rtrim($config["base_url"] ?? "https://api-gateway.ngenius-payments.com", "/");
$apiKey = trim($config["api_key"] ?? "");
$outletReference = trim($config["outlet_reference"] ?? "");
$currency = strtoupper($config["currency"] ?? "AED");
$realmName = trim($config["realm_name"] ?? "NetworkInternational");
$defaultRedirect = $config["redirect_url"] ?? "https://mirruba-jewellery.com/payment/success.htm";
$defaultCancel = $config["cancel_url"] ?? "https://mirruba-jewellery.com/payment/cancel.htm";

if ($apiKey === "" || $outletReference === "") {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Missing API key or outlet reference"]);
    exit;
}

define("NGENIUS_IDENTITY_URL", $baseUrl . "/identity/auth/access-token");
define("NGENIUS_ORDER_BASE_URL", $baseUrl . "/transactions/outlets/" . rawurlencode($outletReference) . "/orders");

$action = $_GET["action"] ?? $_POST["action"] ?? "";

switch ($action) {
    case "get_token":
        echo json_encode(getAccessToken($apiKey, $realmName));
        break;

    case "create_order":
        $amount = intval($_POST["amount"] ?? 0);
        $orderReference = trim($_POST["order_reference"] ?? ("ORD-" . time()));
        $customerEmail = trim($_POST["email"] ?? "");
        $customerName = trim($_POST["name"] ?? "Customer");
        $redirectUrl = trim($_POST["redirect_url"] ?? $defaultRedirect);
        $cancelUrl = trim($_POST["cancel_url"] ?? $defaultCancel);

        if ($amount <= 0) {
            http_response_code(422);
            echo json_encode(["success" => false, "error" => "Invalid amount"]);
            break;
        }

        echo json_encode(createPaymentOrder(
            $amount,
            $orderReference,
            $customerEmail,
            $customerName,
            $redirectUrl,
            $cancelUrl,
            $apiKey,
            $currency
        ));
        break;

    case "check_status":
        $orderReference = trim($_POST["order_reference"] ?? "");
        echo json_encode(getOrderStatus($orderReference, $apiKey));
        break;

    default:
        echo json_encode([
            "success" => true,
            "message" => "N-Genius Payment API is running",
            "currency" => $currency,
            "realm_name" => $realmName
        ]);
}

function curlJson($url, $headers, $postBody = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    if ($postBody !== null) {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postBody));
    }

    $raw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $decoded = null;
    if (is_string($raw) && $raw !== "") {
        $decoded = json_decode($raw, true);
    }

    return [$httpCode, $decoded, $raw, $curlError];
}

function getAccessToken($apiKey, $realmName) {
    list($httpCode, $data, $raw, $curlError) = curlJson(
        NGENIUS_IDENTITY_URL,
        [
            "Authorization: Basic " . $apiKey,
            "Content-Type: application/vnd.ni-identity.v1+json",
            "Accept: application/vnd.ni-identity.v1+json"
        ],
        ["realmName" => $realmName]
    );

    if ($httpCode >= 200 && $httpCode < 300 && !empty($data["access_token"])) {
        return ["success" => true, "access_token" => $data["access_token"]];
    }

    return [
        "success" => false,
        "error" => "Failed to obtain token",
        "http_code" => $httpCode,
        "curl_error" => $curlError,
        "details" => $data,
        "raw" => $raw
    ];
}

function createPaymentOrder($amount, $orderReference, $customerEmail, $customerName, $redirectUrl, $cancelUrl, $apiKey, $currency) {
    $tokenResult = getAccessToken($apiKey, $GLOBALS["realmName"] ?? "NetworkInternational");
    if (empty($tokenResult["success"])) {
        return $tokenResult;
    }

    $order = [
        "action" => "SALE",
        "amount" => [
            "currencyCode" => $currency,
            "value" => $amount
        ],
        "language" => "en",
        "merchantOrderReference" => $orderReference,
        "merchantAttributes" => [
            "redirectUrl" => $redirectUrl . (strpos($redirectUrl, "?") === false ? "?" : "&") . "order_ref=" . rawurlencode($orderReference),
            "cancelUrl" => $cancelUrl
        ],
        "emailAddress" => $customerEmail ?: "customer@mirruba-jewellery.com",
        "billingAddress" => [
            "firstName" => $customerName ?: "Customer"
        ]
    ];

    list($httpCode, $data, $raw, $curlError) = curlJson(
        NGENIUS_ORDER_BASE_URL,
        [
            "Authorization: Bearer " . $tokenResult["access_token"],
            "Content-Type: application/vnd.ni-payment.v2+json",
            "Accept: application/vnd.ni-payment.v2+json"
        ],
        $order
    );

    if (($httpCode === 201 || $httpCode === 200) && !empty($data["_links"]["payment"]["href"])) {
        return [
            "success" => true,
            "payment_url" => $data["_links"]["payment"]["href"],
            "order_reference" => $data["reference"] ?? $orderReference,
            "order_id" => $data["_id"] ?? null
        ];
    }

    return [
        "success" => false,
        "error" => "Failed to create order",
        "http_code" => $httpCode,
        "curl_error" => $curlError,
        "details" => $data,
        "raw" => $raw
    ];
}

function getOrderStatus($orderReference, $apiKey) {
    if ($orderReference === "") {
        return ["success" => false, "error" => "Missing order_reference"];
    }

    $tokenResult = getAccessToken($apiKey, $GLOBALS["realmName"] ?? "NetworkInternational");
    if (empty($tokenResult["success"])) {
        return $tokenResult;
    }

    $statusUrl = NGENIUS_ORDER_BASE_URL . "/" . rawurlencode($orderReference);
    list($httpCode, $data, $raw, $curlError) = curlJson(
        $statusUrl,
        [
            "Authorization: Bearer " . $tokenResult["access_token"],
            "Accept: application/vnd.ni-payment.v2+json"
        ]
    );

    if ($httpCode === 200) {
        return [
            "success" => true,
            "status" => $data["_embedded"]["payment"][0]["state"] ?? "UNKNOWN",
            "raw" => $data
        ];
    }

    return [
        "success" => false,
        "error" => "Failed to get order status",
        "http_code" => $httpCode,
        "curl_error" => $curlError,
        "details" => $data,
        "raw" => $raw
    ];
}

