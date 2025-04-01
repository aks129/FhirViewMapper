import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set document title
document.title = "FHIR Profile to SQL View Definition Transformer";

createRoot(document.getElementById("root")!).render(<App />);
