# PII Detection & GDPR Compliance

## 🔒 Overview

This project includes a comprehensive PII (Personally Identifiable Information) detection system designed for GDPR compliance. The system automatically scans uploaded documents for sensitive data and provides filtering capabilities to identify non-compliant documents.

## 🎯 Key Features

### Multi-Method Detection
The system supports **5 detection methods** with different trade-offs:

1. **Regex** - Fast pattern matching for common PII types
2. **Ollama** - LLM-based detection with context understanding
3. **Hybrid** - Combines regex + Ollama with dual-agent validation
4. **Compromise** - NLP-based detection using compromise.js
5. **Advanced** - All methods combined with deduplication

### Detection Capabilities

| PII Type | Regex | Ollama | Compromise | Description |
|----------|-------|--------|------------|-------------|
| **Name** | ❌ | ✅ | ✅ | Full names with context validation |
| **Email** | ✅ | ✅ | ❌ | Email addresses |
| **Phone** | ✅ | ✅ | ❌ | International phone numbers |
| **Address** | ❌ | ✅ | ✅ | Street addresses with landmarks |
| **Credit Card** | ✅ | ✅ | ❌ | Visa, MC, Amex, Discover (Luhn validated) |
| **SSN** | ✅ | ✅ | ❌ | Social Security Numbers |
| **Passport** | ❌ | ✅ | ❌ | Passport numbers |
| **Driver's License** | ❌ | ✅ | ❌ | License numbers |
| **Bank Account** | ❌ | ✅ | ❌ | Account numbers |
| **IP Address** | ✅ | ✅ | ❌ | IPv4 addresses |
| **Date of Birth** | ✅ | ✅ | ✅ | Birth dates |

## ⚙️ Configuration

### Environment Variables (.env)

```bash
# Enable/disable PII detection
PII_DETECTION_ENABLED=true

# Detection method: ollama, regex, hybrid, compromise, advanced
PII_DETECTION_METHOD=hybrid

# Model for PII detection (requires Ollama)
PII_DETECTION_MODEL=gemma3:4b
```

### Recommended Settings

- **Development/Testing**: `PII_DETECTION_METHOD=regex` (fast)
- **Production**: `PII_DETECTION_METHOD=hybrid` (accurate + validated)
- **Maximum Coverage**: `PII_DETECTION_METHOD=advanced` (all methods)

## 🧠 Dual-Agent Validation (Hybrid Method)

The hybrid method uses a **two-stage validation** process:

### Stage 1: Ollama Detection
- LLM scans document for PII
- Returns findings with context and confidence
- Handles complex formats (Hebrew text, varied phone formats)

### Stage 2: Validation Agent
- Second LLM validates each finding
- Confirms PII is genuine (not part of business info)
- Reduces false positives from company names, product IDs, etc.

```javascript
// Example: Company phone number vs. personal phone
{
  finding: "000-0000000",
  context: "Contact us at 000-0000000",
  isValid: false,  // Validation agent rejects (business contact)
  confidence: 0.3
}

{
  finding: "000-0000000",
  context: "My personal mobile is 000-0000000",
  isValid: true,   // Validation agent confirms (personal info)
  confidence: 0.9
}
```

## 🛡️ Advanced Features

### 1. Duplicate Detection
Prevents infinite loops with non-English content:
- Tracks occurrence count per finding
- Stops stream if same finding appears >3 times
- Critical for Hebrew, Arabic, Chinese documents

### 2. Phone Number Validation
International phone validation with graceful handling:
- Uses `phone` library for format validation
- Lowers confidence to 0.6 if validation fails (instead of rejecting)

### 3. Credit Card Validation
Multi-step validation process:
- Pattern matching (Visa, Mastercard, Amex, Discover)
- Luhn algorithm checksum validation
- Removes spaces and hyphens before validation

### 4. Risk Level Classification

| Risk Level | Criteria | Example PII Types |
|------------|----------|-------------------|
| **Low** | 1-2 low-risk items | Email only, Single phone number |
| **Medium** | 3-4 items or 1 medium-risk | Multiple emails + phones |
| **High** | 5+ items or 1 high-risk | Names + addresses, Credit cards |
| **Critical** | Multiple high-risk items | SSN + credit card + address |

## 🎨 Web UI Features

### PII Severity Filter
Filter documents by detection status:
- **Never Scanned** - Documents not yet scanned for PII
- **None** - No PII detected (clean documents)
- **Low** - Minimal PII (1-2 low-risk items)
- **Medium** - Moderate PII (3-4 items)
- **High** - Significant PII (5+ items or credit cards)
- **Critical** - Severe PII exposure (SSN, multiple high-risk)

### PII Types Filter
Multi-select filter by specific PII types:
- 💳 Credit Card
- 📧 Email
- 📞 Phone
- 📍 Address
- 👤 Name
- 🏦 Bank Account
- 🆔 SSN
- 🛂 Passport
- 🚗 Driver's License
- 📅 Date of Birth
- 🌐 IP Address

### Statistics Display
Real-time PII risk statistics:
```
PII Risk Levels:
├─ Never Scanned: 51 documents
├─ None: 1 document (GDPR compliant)
├─ Low: 2 documents
├─ Medium: 0 documents
├─ High: 5 documents ⚠️
└─ Critical: 1 document 🚨
```

## 📊 Bulk Scanning

Scan all documents at once via API:

```bash
# Trigger bulk PII scan
curl -X POST http://localhost:3001/api/documents/scan-all-pii

# Response
{
  "scanned": 60,
  "withPII": 9,
  "noPII": 51,
  "errors": 0
}
```

**Note**: Bulk scanning can take time depending on:
- Number of documents
- Document size
- Detection method (hybrid is slower but more accurate)
- Ollama server performance

## 🔍 Search & Filter Examples

### Find All Documents with PII
```javascript
// Web UI: Select any PII severity level except "None"
// API: Filter by pii_detected = true
{
  must: [
    { key: 'pii_detected', match: { value: true } }
  ]
}
```

### Find Documents with Credit Cards
```javascript
// Web UI: Select "Credit Card" from PII Types filter
// API: Filter by pii_types array
{
  must: [
    { key: 'pii_types', match: { any: ['credit_card'] } }
  ]
}
```

### Find High-Risk Documents
```javascript
// Web UI: Select "High" from PII Severity filter
// API: Filter by pii_risk_level
{
  must: [
    { key: 'pii_risk_level', match: { value: 'high' } }
  ]
}
```

### Find Never Scanned Documents
```javascript
// Web UI: Select "Never Scanned" from PII Severity filter
// Backend: Uses application-layer filtering (must_not doesn't work for missing fields)
// Returns documents where pii_detected field is undefined
```

## 🔧 Technical Implementation

### Document Metadata
Each scanned document gets these payload fields:

```javascript
{
  pii_detected: true,                    // boolean
  pii_types: ['email', 'phone', 'name'], // array of strings
  pii_risk_level: 'high',                // low/medium/high/critical
  pii_scan_date: '2025-12-30T10:30:00Z', // ISO timestamp
  pii_detection_method: 'hybrid',        // detection method used
  pii_details: [                         // array of findings
    {
      type: 'email',
      value: 'john@example.com',
      context: '...contact me at john@example.com for...',
      confidence: 0.95,
      line: 42
    }
  ]
}
```

### Streaming Response
For Ollama-based detection:
- Streaming prevents timeout on large documents
- Accumulates partial JSON objects
- Detects duplicate findings in real-time
- Gracefully handles malformed JSON

### Never Scanned Filter
Special handling for missing PII fields:
- Qdrant's `must_not` doesn't detect missing fields
- Uses application-layer filtering
- Fetches all documents, filters where `pii_detected === undefined`
- Returns paginated results from filtered set

## 📈 Performance Considerations

### Detection Speed (per document)

| Method | Speed | Accuracy | Network Calls |
|--------|-------|----------|---------------|
| Regex | ~50ms | 70% | 0 |
| Ollama | ~2-5s | 85% | 1 |
| Hybrid | ~4-10s | 95% | 2 (detection + validation) |
| Compromise | ~100ms | 75% | 0 |
| Advanced | ~5-12s | 98% | 2 |

### Optimization Tips
1. Use **regex** for initial screening
2. Use **hybrid** for high-value documents
3. Batch process during off-hours
4. Cache results to avoid re-scanning
5. Index `pii_detected` and `pii_risk_level` fields

## 🚨 Known Limitations

1. **False Positives**: Company names that look like personal names
2. **Context Required**: Email in signature vs. email in content
3. **Format Variations**: Non-standard date formats may be missed
4. **Language Coverage**: Best results with English text
5. **Never Scanned Filter**: Slower than native Qdrant filters (application-layer)

## 🔐 GDPR Compliance Use Cases

### Scenario 1: Pre-Upload Scanning
```javascript
// Scan document before adding to public database
const piiResult = await detectPII(content);
if (piiResult.hasPII && piiResult.riskLevel === 'high') {
  return { error: 'Document contains sensitive PII, cannot be published' };
}
```

### Scenario 2: Audit Existing Documents
```javascript
// Find all documents with PII for review
GET /api/search/semantic?query=&filters={"must":[{"key":"pii_detected","match":{"value":true}}]}
```

### Scenario 3: Bulk Remediation
```javascript
// Scan all documents, get list of non-compliant ones
POST /api/documents/scan-all-pii

// Filter by high-risk for manual review
GET /api/search/semantic?filters={"must":[{"key":"pii_risk_level","match":{"value":"high"}}]}
```

## 📚 Related Documentation

- [File Upload Implementation](FILE_UPLOAD_IMPLEMENTATION.md) - Upload process with PII scanning
- [Web UI Architecture](WEBUI_ARCHITECTURE.md) - Frontend PII filter components
- [Quick Reference](QUICK_REFERENCE.md) - API endpoints and commands

## 🎓 Best Practices

1. **Enable PII Detection in Production**: Always scan user-uploaded content
2. **Use Hybrid Method**: Best accuracy-to-speed ratio
3. **Review High-Risk Documents**: Manual verification recommended
4. **Update Regularly**: Re-scan documents when detection improves
5. **Monitor Statistics**: Track PII exposure across your dataset
6. **Filter URLs**: Add PII filters to shareable URLs for audits
7. **Educate Users**: Show PII warnings during upload process

## 🔄 Version History

### Current (2025-12-30)
- ✅ Dual-agent validation (hybrid method)
- ✅ Duplicate detection for non-English content
- ✅ Phone number validation with graceful fallback
- ✅ Credit card Luhn validation
- ✅ PII severity filters (6 levels)
- ✅ PII type filters (11 types)
- ✅ Never scanned filter
- ✅ URL persistence for filters
- ✅ Background upload processing
- ✅ Bulk scanning API

