# Dataverse Row Counter Studio 🧮

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Dataverse](https://img.shields.io/badge/Microsoft%20Dataverse-Power%20Apps-742774.svg)](https://powerapps.microsoft.com/)
[![WebAPI](https://img.shields.io/badge/OData%20v4-Web%20API-blue.svg)](https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/overview)

A high-performance, 100% client-side developer studio to quickly count records in **Microsoft Dataverse** and **Dynamics 365** directly in your browser. Fast, secure alternative to XrmToolBox plugins like *Fast Record Counter* and *FetchXml Record Counter* with **zero credential sharing**.

Part of the developer tooling suite alongside **[FetchXmlTester](https://www.ashishvishwakarma.com/FetchXmlTester)** and **[OData WebAPI Tester](https://www.ashishvishwakarma.com/webapi-tester)**.

Live Studio: **[https://www.ashishvishwakarma.com/DataverseRowCounter](https://www.ashishvishwakarma.com/DataverseRowCounter)**

---

## Key Features

1. **Browser Single Sign-On (SSO)**:
   - Executes queries directly within your authenticated browser session against Dataverse via native SSO in a new tab.
   - Zero passwords, client secrets, or auth tokens are ever transmitted or stored on external servers.

2. **Environment Context Studio**:
   - Save and switch between development, UAT, and production tenants with 1-click pills.
   - Shared local storage parity (`lsOrgURLs`, `qdv_active_env`, `orgURL`) across **Quick Data Viewer (QDV)**, **FetchXmlTester**, and **webapi-tester**.
   - Automatic URL sanitization on paste (strips app IDs, `/main.aspx`, `/api/...`, and query params).

3. **Multi-Method Record Counting**:
   - **Aggregate Count (Standard)**: Executes optimized Aggregate FetchXML (`aggregate="count"`) for standard tables.
   - **Snapshot Count (50k+ Rows) 📷**: Uses Dataverse's high-speed internal snapshot function (`RetrieveTotalRecordCount`) for massive tables where aggregate limits apply.
   - **Filtered Counts 🦚**: One-click dropdown to count:
     - Active records (`statecode = 0`)
     - Inactive records (`statecode = 1`)
     - Records created Today (`createdon = today`)
     - Records created in the Last 7 Days
     - Records created in the Last 30 Days

4. **Category Grouping & Live Filtering**:
   - Browse tables organized by functional categories: **Common**, **Sales**, **Service**, **Activity**, **System**, **Marketing**, and **Custom**.
   - Instant real-time fuzzy search filtering.
   - Quick table adder with enter-key shortcut.

5. **Deep Linking & Sharing**:
   - Connect or activate environments directly via URL parameters: `?env=<org_url>` or `?org=<org_url>`.
   - One-click sharable studio link (`Ctrl + Shift + S`).

6. **Modern Dark & Light Mode**:
   - Fluent & Jakarta Sans typography, refined purple/indigo gradient accents, sleek dark mode support.

---

## URL Deep Linking Parameters

| Parameter | Example | Purpose |
| :--- | :--- | :--- |
| **`?env=`** / **`?org=`** | `?env=https://contoso.crm.dynamics.com` | Automatically connects to and activates the specified Dataverse tenant in the Environment Context Studio. |

### Example Sharable URL:
```
https://www.ashishvishwakarma.com/DataverseRowCounter/?env=https%3A%2F%2Fcontosocrm.crm.dynamics.com
```

---

## Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl / Cmd + K` | **Environment Manager**: Open Environment Context Studio modal |
| `Ctrl / Cmd + Shift + S` | **Share Link**: Copy one-click sharable studio link with active environment |
| `Enter` (in Add Table box) | **Add Table**: Add custom table to workspace |
| `Esc` | **Close**: Dismiss modals and dropdown option panels |

---

## Tooling Suite Family

- **[FetchXmlTester](https://www.ashishvishwakarma.com/FetchXmlTester)**: Real-time FetchXML formatting, syntax validation, execution, and code generation.
- **[OData WebAPI Tester](https://www.ashishvishwakarma.com/webapi-tester)**: Multi-line OData syntax editor, visual clause builder, and code generator.
- **[Quick Data Viewer (QDV)](https://www.ashishvishwakarma.com/qdv)**: Lightweight web-based entity viewer and record browser.

---

## Author

Created with ❤️ by **[Ashish Vishwakarma (AshV)](https://www.ashishvishwakarma.com/)**.
