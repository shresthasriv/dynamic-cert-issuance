import React from 'react';
import { Certificate } from '../types';
import { Eye, RotateCw, Share2, Copy } from 'lucide-react';

interface CertificatesTableProps {
  certificates: Certificate[];
  selectedCertificateIds: string[];
  getStatusBadge: (status: Certificate['status']) => React.ReactNode;
  handleSelectAll: (selected: boolean) => void;
  handleCertificateSelect: (certificateId: string, selected: boolean) => void;
  handleViewCertificate: (certificate: Certificate) => void;
  handleCertificateAction: (action: 'retry' | 'reissue', certificateId: string) => void;
}

const CertificatesTable: React.FC<CertificatesTableProps> = ({
  certificates,
  selectedCertificateIds,
  getStatusBadge,
  handleSelectAll,
  handleCertificateSelect,
  handleViewCertificate,
  handleCertificateAction,
}) => {
  return (
    <div className="certificates-table-container">
      <h3>Certificates in this Batch</h3>
      <div className="table-wrapper">
        <table className="certificates-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  checked={certificates.length > 0 && selectedCertificateIds.length === certificates.length}
                />
              </th>
              <th>Certificate ID</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {certificates.map((certificate) => (
              <tr key={certificate.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selectedCertificateIds.includes(certificate.id)}
                    onChange={(e) => handleCertificateSelect(certificate.id, e.target.checked)}
                  />
                </td>
                <td>
                  <div className="cert-id" title={certificate.certificateId}>
                    {certificate.certificateId}
                    <Copy
                      size={14}
                      className="copy-icon"
                      onClick={() => navigator.clipboard.writeText(certificate.certificateId)}
                    />
                  </div>
                  <div className="filename">{certificate.filename}</div>
                </td>
                <td>{getStatusBadge(certificate.status)}</td>
                <td>
                  <div className="action-buttons">
                    <button onClick={() => handleViewCertificate(certificate)} className="btn btn-sm btn-secondary" title="View Certificate">
                      <Eye size={14} /> View
                    </button>
                    <button onClick={() => handleCertificateAction('retry', certificate.id)} className="btn btn-sm btn-secondary" title="Retry Issuance" disabled={certificate.status === 'in-progress'}>
                      <RotateCw size={14} /> Retry
                    </button>
                    <button onClick={() => handleCertificateAction('reissue', certificate.id)} className="btn btn-sm btn-secondary" title="Reissue certificate" disabled={certificate.status === 'in-progress'}>
                      <Share2 size={14} /> Reissue
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CertificatesTable; 