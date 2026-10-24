/**
 * ANVITRACE — API Client for Backend Communication
 * Connects directly to the 14 FastAPI backend endpoints.
 */

const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || '/api';

export interface DatasetStatus {
  dataset_id: string;
  dataset_hash: string;
  filename: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  repeated_tx_ids: number;
  exact_duplicates: number;
  status: string;
}

export interface DatasetStats {
  dataset_id: string;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  total_accounts: number;
  total_volume_inr: number;
  distinct_senders: number;
  distinct_receivers: number;
  repeated_tx_ids: number;
  exact_duplicates: number;
  payment_mode_distribution: Record<string, number>;
}

export interface AccountProfile {
  account_id: string;
  dataset_id: string;
  in_tx_count: number;
  out_tx_count: number;
  in_amount: number;
  out_amount: number;
  observed_net_flow: number;
  distinct_senders: number;
  distinct_receivers: number;
  first_tx_timestamp?: string;
  last_tx_timestamp?: string;
  disclaimer: string;
}

export interface MoneyTrailEdge {
  hop: number;
  record_id: string;
  Transaction_ID: string;
  from_account: string;
  to_account: string;
  amount: number;
  timestamp: string;
  payment_mode: string;
  attributable_amount: number;
  lineage_status: string;
  is_cycle: boolean;
  parent_record_id?: string;
  direction?: 'root' | 'upstream' | 'downstream';
  provenance: Record<string, any>;
}

export interface GraphNode {
  id: string;
  hop: number;
  total_inflow: number;
  total_outflow: number;
  role?: string;
}

export interface InvestigationTrace {
  investigation_id: string;
  victim_account: string;
  dataset_id: string;
  max_hops: number;
  money_trail: MoneyTrailEdge[];
  graph: {
    nodes: GraphNode[];
    edges: MoneyTrailEdge[];
    total_hops_found: number;
    total_attributed_amount: number;
  };
  execution_time_ms: number;
  disclaimer: string;
  evidence_metadata?: {
    investigation_id: string;
    victim_account: string;
    supporting_record_ids: string[];
    supporting_transaction_ids: string[];
    result_hash: string;
  };
}

export interface RiskFeature {
  feature_name: string;
  score_contribution: number;
  measured_value: any;
  explanation: string;
  supporting_record_ids: string[];
  supporting_transaction_ids: string[];
}

export interface LayerClassification {
  role: string;
  confidence: number;
  evidence_summary: string;
  supporting_record_ids: string[];
}

export interface AccountRiskProfile {
  account_id: string;
  dataset_id: string;
  mule_risk_index: number;
  risk_tier: string;
  features: RiskFeature[];
  layer_classifications: LayerClassification[];
  rule_version: string;
  baseline_mitigation_applied: boolean;
  evaluation_timestamp: string;
  disclaimer: string;
}

export interface RecoveryCandidate {
  account_id: string;
  observed_net_flow: number;
  total_incoming_amount: number;
  total_outgoing_amount: number;
  retention_percentage: number;
  time_window_start?: string;
  time_window_end?: string;
  supporting_incoming_record_ids: string[];
  supporting_outgoing_record_ids: string[];
  mule_risk_index?: number;
  recovery_priority_score: number;
  recovery_related_evidence: Record<string, any>;
  disclaimer: string;
}

export interface CrossVictimResponse {
  dataset_id: string;
  analyzed_victims: string[];
  shared_infrastructure_candidates: Array<{
    candidate_account_id: string;
    connected_victim_accounts: string[];
    victim_count: number;
    shared_device_types: string[];
    shared_ip_addresses: string[];
    connecting_transactions: any[];
    total_flowing_amount: number;
    candidate_layer_roles: string[];
    linkage_rationale: string;
  }>;
  candidate_linkage_disclaimer: string;
}

export interface EvidenceSnapshotResponse {
  snapshot: {
    investigation_id: string;
    dataset_id: string;
    dataset_hash: string;
    app_version: string;
    rule_version: string;
    victim_account: string;
    max_hops: number;
    result_hash: string;
    created_at: string;
    money_trail_summary: Record<string, any>;
    layer_candidates: any[];
    risk_summary: Record<string, any>;
    evidence_items: any[];
    integrity_disclaimer: string;
  };
  reproducibility_note: string;
}

export type DatasetStatistics = DatasetStats;

export interface DocumentResponse {
  document_id: string;
  investigation_id: string;
  file_path: string;
  file_format?: string;
  generated_at: string;
  integrity_hash: string;
  victim_account?: string;
  target_account_id?: string;
  document_type?: string;
  disclaimer?: string;
  rendered_text?: string;
  page_count?: number;
  evidence_item_count?: number;
  evidence_summary?: Record<string, any>;
}

export const api = {
  // 1. Health
  checkHealth: async () => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error('Backend offline');
    return res.json();
  },

  // 2. Dataset
  getDatasetStatus: async (datasetId?: string): Promise<DatasetStatus> => {
    const url = datasetId ? `${API_BASE}/dataset/status?dataset_id=${datasetId}` : `${API_BASE}/dataset/status`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Dataset status unavailable');
    return res.json();
  },

  getDatasetStats: async (datasetId?: string): Promise<DatasetStats> => {
    const url = datasetId ? `${API_BASE}/dataset/statistics?dataset_id=${datasetId}` : `${API_BASE}/dataset/statistics`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Dataset statistics unavailable');
    return res.json();
  },

  uploadDataset: (
    file: File,
    onProgress?: (progress: { percent: number; stage: string; loaded?: number; total?: number }) => void
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);

      xhr.open('POST', `${API_BASE}/dataset/upload`);

      if (onProgress) {
        onProgress({ percent: 5, stage: 'Preparing evidence CSV payload...', loaded: 0, total: file.size });
      }

      // Track network transfer (5% to 50%)
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          const uploadPercent = Math.min(50, Math.round(5 + (event.loaded / event.total) * 45));
          const mbLoaded = (event.loaded / (1024 * 1024)).toFixed(1);
          const mbTotal = (event.total / (1024 * 1024)).toFixed(1);
          onProgress({
            percent: uploadPercent,
            stage: `Streaming evidence CSV payload (${mbLoaded} / ${mbTotal} MB)...`,
            loaded: event.loaded,
            total: event.total,
          });
        }
      };

      // When all bytes are uploaded, backend processes 2M+ rows in DuckDB
      let processingTimer: any = null;
      xhr.upload.onload = () => {
        if (onProgress) {
          onProgress({
            percent: 50,
            stage: 'Evidence uploaded. Initializing vectorized ingestion...',
            loaded: file.size,
            total: file.size,
          });
          let p = 50;
          let elapsedSec = 0;
          processingTimer = setInterval(() => {
            elapsedSec += 1;
            // Smoothly advance through realistic phases
            if (p < 94) {
              p += 1.0;
            } else if (p < 99) {
              p += 0.2;
            }
            if (p > 99) p = 99;

            let stageText = `Validating CSV schema & delimiters (${elapsedSec}s)...`;
            if (p >= 58 && p < 72) {
              stageText = `Normalizing records & streaming into DuckDB (${elapsedSec}s)...`;
            } else if (p >= 72 && p < 86) {
              stageText = `Building temporal & forensic graph indexes (${elapsedSec}s)...`;
            } else if (p >= 86 && p < 94) {
              stageText = `Precomputing account analytics & risk features (${elapsedSec}s)...`;
            } else if (p >= 94) {
              stageText = `Finalizing forensic verification & integrity check (${elapsedSec}s)...`;
            }

            if (onProgress) {
              onProgress({
                percent: Math.min(99, Math.floor(p)),
                stage: stageText,
                loaded: file.size,
                total: file.size,
              });
            }
          }, 1000);
        }
      };

      xhr.onload = () => {
        if (processingTimer) clearInterval(processingTimer);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (onProgress) {
              onProgress({
                percent: 100,
                stage: 'Ingestion complete! All records verified.',
                loaded: file.size,
                total: file.size,
              });
            }
            resolve(data);
          } catch (e) {
            reject(new Error('Failed to parse server response'));
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.detail || 'Dataset upload failed'));
          } catch {
            reject(new Error(`Upload failed with HTTP ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        if (processingTimer) clearInterval(processingTimer);
        reject(new Error('Network error during file upload'));
      };

      xhr.ontimeout = () => {
        if (processingTimer) clearInterval(processingTimer);
        reject(new Error('Upload timed out'));
      };

      xhr.send(formData);
    });
  },

  resetDataset: async (): Promise<{ status: string; message: string }> => {
    const res = await fetch(`${API_BASE}/dataset/reset`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Dataset reset failed');
    return res.json();
  },

  // 3. Accounts & Investigations
  getAccount: async (accountId: string, datasetId?: string): Promise<AccountProfile> => {
    const url = datasetId ? `${API_BASE}/accounts/${accountId}?dataset_id=${datasetId}` : `${API_BASE}/accounts/${accountId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Account ${accountId} not found`);
    return res.json();
  },

  getAccountTransactions: async (accountId: string, datasetId?: string, limit = 100) => {
    const url = datasetId
      ? `${API_BASE}/accounts/${accountId}/transactions?dataset_id=${datasetId}&limit=${limit}`
      : `${API_BASE}/accounts/${accountId}/transactions?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Account transactions unavailable');
    return res.json();
  },

  traceInvestigation: async (
    accountId: string,
    params: { datasetId?: string; maxHops?: number; minAmount?: number; timeWindowHours?: number } = {}
  ): Promise<InvestigationTrace> => {
    const q = new URLSearchParams();
    if (params.datasetId) q.append('dataset_id', params.datasetId);
    if (params.maxHops) q.append('max_hops', params.maxHops.toString());
    if (params.minAmount) q.append('min_amount', params.minAmount.toString());
    if (params.timeWindowHours) q.append('time_window_hours', params.timeWindowHours.toString());

    const res = await fetch(`${API_BASE}/investigations/trace/${accountId}?${q.toString()}`);
    if (!res.ok) throw new Error(`Trace failed for account ${accountId}`);
    return res.json();
  },

  getAccountRisk: async (accountId: string, datasetId?: string): Promise<AccountRiskProfile> => {
    const url = datasetId ? `${API_BASE}/accounts/${accountId}/risk?dataset_id=${datasetId}` : `${API_BASE}/accounts/${accountId}/risk`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Risk assessment unavailable');
    return res.json();
  },

  // 4. Recovery
  getRecoveryCandidates: async (
    datasetIdOrLimit?: string | number,
    limitParam = 50
  ): Promise<{ candidates: RecoveryCandidate[]; total_candidates: number }> => {
    let datasetId: string | undefined = undefined;
    let limit = limitParam;
    if (typeof datasetIdOrLimit === 'number') {
      limit = datasetIdOrLimit;
    } else if (typeof datasetIdOrLimit === 'string') {
      datasetId = datasetIdOrLimit;
    }
    const url = datasetId
      ? `${API_BASE}/recovery/candidates?dataset_id=${datasetId}&limit=${limit}`
      : `${API_BASE}/recovery/candidates?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Recovery candidates unavailable');
    return res.json();
  },

  // 5. Cross-Victim
  analyzeCrossVictim: async (victimAccounts: string[], datasetId?: string, maxHops = 4): Promise<CrossVictimResponse> => {
    const res = await fetch(`${API_BASE}/syndicates/cross-victim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        victim_accounts: victimAccounts,
        dataset_id: datasetId,
        max_hops: maxHops,
      }),
    });
    if (!res.ok) throw new Error('Cross-victim analysis failed');
    return res.json();
  },

  // 6. Evidence & Documents
  createSnapshot: async (victimAccount: string, datasetId?: string, maxHops = 4): Promise<EvidenceSnapshotResponse> => {
    const res = await fetch(`${API_BASE}/evidence/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        victim_account: victimAccount,
        dataset_id: datasetId,
        max_hops: maxHops,
      }),
    });
    if (!res.ok) throw new Error('Snapshot creation failed');
    return res.json();
  },

  createEvidenceSnapshot: async (victimAccount: string, datasetId?: string, maxHops = 4): Promise<{ snapshot: any; result_hash: string }> => {
    const res = await api.createSnapshot(victimAccount, datasetId, maxHops);
    return {
      snapshot: res.snapshot,
      result_hash: res.snapshot.result_hash,
    };
  },

  generateCaseDiary: async (params: {
    victimAccount: string;
    datasetId?: string;
    officerName?: string;
    officerDesignation?: string;
    caseReference?: string;
  }): Promise<DocumentResponse> => {
    const res = await fetch(`${API_BASE}/documents/case-diary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        victim_account: params.victimAccount,
        dataset_id: params.datasetId,
        officer_name: params.officerName || 'Investigating Officer',
        officer_designation: params.officerDesignation || 'Cyber Crime Investigation Cell',
        case_reference: params.caseReference || 'CASE-FORENSIC-01',
      }),
    });
    if (!res.ok) throw new Error('Case diary generation failed');
    return res.json();
  },

  generateFreezeRequisition: async (params: {
    targetAccountId: string;
    datasetId?: string;
    requestingOfficer?: string;
    bankName?: string;
    caseReference?: string;
  }): Promise<DocumentResponse> => {
    const res = await fetch(`${API_BASE}/documents/freeze-requisition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_account_id: params.targetAccountId,
        dataset_id: params.datasetId,
        requesting_officer: params.requestingOfficer || 'Investigating Officer',
        bank_name: params.bankName || 'Target Banking Institution',
        case_reference: params.caseReference || 'CASE-FORENSIC-01',
      }),
    });
    if (!res.ok) throw new Error('Freeze requisition generation failed');
    return res.json();
  },

  getDocumentDownloadUrl: (documentId: string): string => {
    return `${API_BASE}/documents/download/${documentId}`;
  },

  // 7. Multi-File Ingestion
  uploadMultipleDatasets: async (files: File[]): Promise<any> => {
    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    const res = await fetch(`${API_BASE}/dataset/upload-multi`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Multi-file ingestion failed' }));
      throw new Error(err.detail || 'Multi-file upload failed');
    }
    return res.json();
  },

  // 8. Isolation Forest ML Anomaly
  getAccountMLAnomaly: async (accountId: string, datasetId?: string): Promise<AccountMLAnomaly> => {
    const url = datasetId
      ? `${API_BASE}/accounts/${encodeURIComponent(accountId)}/ml-anomaly?dataset_id=${encodeURIComponent(datasetId)}`
      : `${API_BASE}/accounts/${encodeURIComponent(accountId)}/ml-anomaly`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('ML anomaly scoring unavailable');
    return res.json();
  },

  // 9. Universal Multi-Identifier Search
  searchUniversal: async (
    query: string,
    fieldType: string = 'auto',
    datasetId?: string,
    limit: number = 50
  ): Promise<UniversalSearchResult> => {
    const params = new URLSearchParams({ q: query, field_type: fieldType, limit: String(limit) });
    if (datasetId) params.append('dataset_id', datasetId);
    const res = await fetch(`${API_BASE}/investigations/search?${params.toString()}`);
    if (!res.ok) throw new Error('Universal search failed');
    return res.json();
  },

  // 10. Primary Investigation Candidates
  getPrimaryCandidates: async (datasetId?: string, limit: number = 10): Promise<PrimaryCandidate[]> => {
    const url = datasetId
      ? `${API_BASE}/investigations/primary-candidates?dataset_id=${encodeURIComponent(datasetId)}&limit=${limit}`
      : `${API_BASE}/investigations/primary-candidates?limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Primary candidate recommendation unavailable');
    return res.json();
  },

  // 11. SHA-256 Baseline Integrity & Change Detection
  verifyIntegrity: async (datasetId?: string, filename?: string): Promise<IntegrityReport> => {
    const params = new URLSearchParams();
    if (datasetId) params.append('dataset_id', datasetId);
    if (filename) params.append('filename', filename);
    const res = await fetch(`${API_BASE}/evidence/verify-integrity?${params.toString()}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Integrity verification failed');
    return res.json();
  },

  // 11b. Physical Evidence & Judge Demo Verify-by-Upload
  listEvidenceFiles: async (datasetId?: string): Promise<EvidenceDetail[]> => {
    const url = datasetId
      ? `${API_BASE}/evidence?dataset_id=${encodeURIComponent(datasetId)}`
      : `${API_BASE}/evidence`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to retrieve evidence files');
    return res.json();
  },

  getEvidenceDetails: async (evidenceId: string): Promise<EvidenceDetail> => {
    const res = await fetch(`${API_BASE}/evidence/${encodeURIComponent(evidenceId)}`);
    if (!res.ok) throw new Error('Evidence not found');
    return res.json();
  },

  verifyStoredEvidence: async (evidenceId: string): Promise<EvidenceVerifyResult> => {
    const res = await fetch(`${API_BASE}/evidence/${encodeURIComponent(evidenceId)}/verify`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Evidence re-verification failed');
    return res.json();
  },

  verifyEvidenceUpload: async (evidenceId: string, file: File): Promise<EvidenceVerifyResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/evidence/${encodeURIComponent(evidenceId)}/verify-upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Candidate file verification failed');
    return res.json();
  },

  getEvidenceHistory: async (evidenceId: string): Promise<VerificationHistoryItem[]> => {
    const res = await fetch(`${API_BASE}/evidence/${encodeURIComponent(evidenceId)}/history`);
    if (!res.ok) throw new Error('Failed to retrieve verification history');
    return res.json();
  },

  verifyAuditChain: async (): Promise<AuditChainStatus> => {
    const res = await fetch(`${API_BASE}/audit/verify`);
    if (!res.ok) throw new Error('Audit verification failed');
    return res.json();
  },

  getAuditEvents: async (
    entityId?: string,
    action?: string,
    limit = 50,
    offset = 0
  ): Promise<{ total: number; events: AuditEventItem[] }> => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (entityId) params.append('entity_id', entityId);
    if (action) params.append('action', action);
    const res = await fetch(`${API_BASE}/audit/events?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to retrieve audit events');
    return res.json();
  },

  // 12. Case AI: Bilingual Summaries & Isolated Chat
  registerCase: async (docket: any): Promise<any> => {
    const res = await fetch(`${API_BASE}/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(docket),
    });
    if (!res.ok) throw new Error('Failed to register case docket');
    return res.json();
  },

  listCases: async (): Promise<any[]> => {
    const res = await fetch(`${API_BASE}/cases`);
    if (!res.ok) throw new Error('Failed to list cases');
    return res.json();
  },

  generateCaseSummary: async (
    caseId: string,
    language: 'en' | 'hi' = 'en',
    datasetId?: string
  ): Promise<CaseSummaryData> => {
    const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language, dataset_id: datasetId }),
    });
    if (!res.ok) throw new Error('Case summary generation failed');
    return res.json();
  },

  chatWithCase: async (
    caseId: string,
    question: string,
    datasetId?: string
  ): Promise<CaseChatResponse> => {
    const res = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, dataset_id: datasetId }),
    });
    if (!res.ok) throw new Error('Case chat request failed');
    return res.json();
  },
};

export interface MLAnomalyExplanation {
  feature_name: string;
  feature_label: string;
  value: number;
  population_median: number;
  deviation_factor: number;
  direction: string;
  explanation: string;
}

export interface AccountMLAnomaly {
  account_id: string;
  dataset_id: string;
  anomaly_score: number;
  is_anomaly: boolean;
  raw_score: number;
  explanations: MLAnomalyExplanation[];
  combined_priority_score: number;
  model_version: string;
  disclaimer: string;
}

export interface PrimaryCandidate {
  account_id: string;
  dataset_id: string;
  investigation_priority_score: number;
  rule_risk_score: number;
  ml_anomaly_score: number;
  candidate_tier: string;
  in_amount: number;
  out_amount: number;
  in_tx_count: number;
  out_tx_count: number;
  distinct_senders: number;
  distinct_receivers: number;
  supporting_signals: string[];
  why_ranked: string;
  disclaimer: string;
}

export interface UniversalSearchResult {
  query: string;
  detected_type: string;
  field_type_used: string;
  dataset_id: string;
  total_count: number;
  results: any[];
}

export interface IntegrityReport {
  status: 'VERIFIED_MATCH' | 'HASH_MISMATCH' | 'NO_BASELINE' | 'ERROR';
  filename: string;
  dataset_id?: string;
  stored_baseline_sha256?: string;
  current_sha256?: string;
  file_size_bytes?: number;
  baseline_timestamp?: string;
  verified: boolean;
  changes_detected?: boolean;
  total_records?: number;
  baseline_records?: number;
  current_records?: number;
  row_count_delta?: number;
  modified_records_sample?: Array<{
    transaction_id: string;
    changes: Array<{ field: string; original: any; current: any }>;
  }>;
  message: string;
  disclaimer?: string;
}

export interface CaseSummaryData {
  case_id: string;
  language: string;
  target_account: string;
  generated_at: string;
  sections: Record<string, string>;
  disclaimer: string;
}

export interface CaseChatResponse {
  case_id: string;
  question: string;
  answer: string;
  sources: any[];
  suggested_followups: string[];
  disclaimer: string;
}

export interface EvidenceVerifyResult {
  evidence_id: string;
  filename?: string;
  status: 'VERIFIED' | 'MISMATCH' | 'MISSING';
  recorded_sha256?: string;
  recomputed_sha256?: string;
  recorded_size?: number;
  current_size?: number;
  candidate_size?: number;
  note: string;
}

export interface VerificationHistoryItem {
  event_id: string;
  checked_at: string;
  recomputed_sha256: string;
  status: 'VERIFIED' | 'MISMATCH' | 'MISSING';
  note?: string;
}

export interface EvidenceDetail {
  evidence_id: string;
  dataset_id?: string;
  filename: string;
  storage_path: string;
  size_bytes: number;
  algorithm: string;
  sha256: string;
  recorded_at: string;
  last_verification_status: string;
}

export interface AuditChainStatus {
  ok: boolean;
  status: 'INTACT' | 'BROKEN' | 'EMPTY';
  total_events: number;
  last_hash?: string;
  broken_at_seq?: number;
  reason?: string;
  message: string;
}

export interface AuditEventItem {
  seq: number;
  ts: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  prev_hash: string;
  entry_hash: string;
}

