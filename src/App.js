import React, { useState } from "react";
import axios from "axios";

function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!url.match(/^https?:\/\//)) {
      setError("URL must start with http:// or https://");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await axios.post("/convert", { url });

      if (!response.data.success) {
        throw new Error(response.data.error || "Conversion failed");
      }

      setResult({
        imageBase64: response.data.imageBase64,
        dimensions: response.data.metrics.dimensions,
        sizeKB: response.data.metrics.sizeKB,
        format: response.data.metrics.format || "jpeg", // Default to jpeg if not specified
      });
    } catch (err) {
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        "Conversion failed. Please try again.";
      setError(errorMessage);
      console.error("Conversion error:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(result.imageBase64)
      .then(() => alert("Base64 image copied to clipboard!"))
      .catch(() => alert("Failed to copy to clipboard"));
  };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "800px",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h1 style={{ color: "#333", textAlign: "center" }}>
        URL to Figma Converter
      </h1>

      <form
        onSubmit={handleSubmit}
        style={{
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter website URL (e.g., https://example.com)"
          style={{
            flex: 1,
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginRight: "10px",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 20px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Converting..." : "Convert"}
        </button>
      </form>

      {error && (
        <div
          style={{
            color: "white",
            backgroundColor: "#f44336",
            padding: "10px",
            borderRadius: "4px",
            margin: "10px 0",
          }}
        >
          Error: {error}
        </div>
      )}

      {result && (
        <div style={{ marginTop: "20px" }}>
          <div
            style={{
              backgroundColor: "#f8f9fa",
              padding: "15px",
              borderRadius: "4px",
              marginBottom: "20px",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Conversion Successful!</h3>
            <p>
              <strong>Dimensions:</strong> {result.dimensions} |{" "}
              <strong>Size:</strong> {result.sizeKB}KB |{" "}
              <strong>Format:</strong> {result.format.toUpperCase()}
            </p>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h4>Option 1: Use with Figma Plugin</h4>
            <div style={{ display: "flex" }}>
              <textarea
                value={result.imageBase64}
                readOnly
                style={{
                  flex: 1,
                  height: "100px",
                  padding: "10px",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  marginRight: "10px",
                  fontFamily: "monospace",
                }}
              />
              <button
                onClick={copyToClipboard}
                style={{
                  padding: "0 15px",
                  backgroundColor: "#2196F3",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Copy
              </button>
            </div>
            <p style={{ fontSize: "0.9em", color: "#666" }}>
              Paste this into your Figma plugin
            </p>
          </div>

          <div>
            <h4>Option 2: Manual Import</h4>
            <div
              style={{
                border: "1px solid #ddd",
                padding: "10px",
                borderRadius: "4px",
                marginBottom: "10px",
              }}
            >
              <img
                src={`data:image/${result.format};base64,${result.imageBase64}`}
                alt="Converted preview"
                style={{
                  maxWidth: "100%",
                  display: "block",
                  margin: "0 auto",
                }}
              />
            </div>
            <p style={{ fontSize: "0.9em", color: "#666" }}>
              Right-click the image above and select "Copy Image", then paste
              directly into Figma
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
