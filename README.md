=

# 🧱 SQL-on-FHIR View Definition Builder

The **SQL-on-FHIR View Definition Builder** is an interactive tool that helps you automatically generate **FHIR-native SQL views** from HL7 FHIR **Implementation Guides (IGs)** and **Profiles**. The goal is to bridge the gap between complex FHIR resources and SQL-based analytics engines by enabling direct view generation based on standardized FHIR structure definitions.

## 🔍 What It Does

This tool lets you:

* Select a FHIR Implementation Guide (e.g., **US Core**)
* Choose a specific **FHIR Profile** (e.g., `USCorePatient`)
* Automatically generate a **ViewDefinition** object in SQL-on-FHIR format
* Export or integrate it with SQL-on-FHIR-compatible databases (e.g., PostgreSQL, BigQuery, Databricks)

---

## ✨ Key Features

| Feature                      | Description                                                       |
| ---------------------------- | ----------------------------------------------------------------- |
| 🔎 IG + Profile Browser      | Select IGs and their available FHIR profiles                      |
| 📐 Auto View Builder         | Generates view definitions aligned with FHIR StructureDefinitions |
| ⚙️ Customizable Fields       | Include/exclude fields or modify aliases                          |
| 🔄 JSON + SQL Export         | Output in SQL-on-FHIR JSON or templated SQL                       |
| 🧪 View Tester (Coming Soon) | Validate output view definition against sample Bundles            |

---

## 📁 Folder Structure

```
.
├── /src
│   ├── components/         # UI components
│   ├── services/           # FHIR IG and profile fetchers
│   └── utils/              # View generation logic
├── /data                   # Example profiles and IG metadata
├── /public                 # Static assets
└── index.html              # App entry point
```

---

## 🚀 Getting Started

### Prerequisites

* Node.js 18+
* Yarn or npm
* A local or hosted SQL-on-FHIR-compatible data lake (for testing optional)

### Install & Run

```bash
git clone https://github.com/your-org/sql-on-fhir-view-builder.git
cd sql-on-fhir-view-builder
npm install
npm start
```

---

## 🛠 How It Works

1. **User selects an IG** → pulls IG metadata and available profiles
2. **Profile is selected** → tool loads the StructureDefinition JSON
3. **Flattening logic** maps element paths to SQL fields
4. **ViewDefinition object** is constructed
5. **Output** can be copied/exported for use in downstream data platforms

---

## 🔌 Example Output

```json
{
  "resourceType": "ViewDefinition",
  "name": "USCorePatientView",
  "description": "Flattened SQL view of US Core Patient",
  "select": [
    { "alias": "id", "path": "Patient.id" },
    { "alias": "birthDate", "path": "Patient.birthDate" },
    { "alias": "gender", "path": "Patient.gender" }
  ]
}
```

---

## 🌐 Supported Standards

* **FHIR R4** (R5 support planned)
* **SQL-on-FHIR ViewDefinition** spec:
  [https://build.fhir.org/ig/HL7/sql-on-fhir/](https://build.fhir.org/ig/HL7/sql-on-fhir/)
* US Core 6.1.0, CARIN BB, DaVinci PDex, QI-Core (more coming)

---

## 🔭 Roadmap

* [ ] Add View Testing with FHIR Bundles
* [ ] Add Profile Differential Viewer
* [ ] IG auto-fetch via Simplifier / Registry APIs
* [ ] Export to BigQuery / Spark-compatible formats
* [ ] Support for `StructureMap`-based transformations

---

## 🤝 Contributing

We welcome PRs and community testing! Please open issues for:

* New IG support
* Incorrect mappings
* Integration help

---

## 👤 Maintainer

Built by **FHIR IQ / Eugene Vestel**
🔗 [https://www.fhiriq.com](https://www.fhiriq.com)
🧠 [FHIR Goats LinkedIn Group](https://www.linkedin.com/groups/12732939/)

---

## 📜 License

MIT — Free to use, improve, and share under open-source license.

