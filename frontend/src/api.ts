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

  uploadDataset: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/dataset/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Dataset upload failed');
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
};
