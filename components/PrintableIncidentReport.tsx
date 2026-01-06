import React, { useEffect } from 'react';
import { FetchedIncident } from '../types';
import { getRiskLevel } from '../constants';

interface PrintableIncidentReportProps {
  incident: FetchedIncident;
}

export const PrintableIncidentReport: React.FC<PrintableIncidentReportProps> = ({ incident }) => {
  const { fields } = incident;
  const riskScore = (fields.Severity || 0) * (fields.Likelihood || 0);
  const riskInfo = getRiskLevel(riskScore);

  useEffect(() => {
    document.title = `Incident Report - ${fields.Title}`;
  }, [fields.Title]);

  const DetailItem: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => (
    <div className="border-b border-gray-200 py-3">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-gray-800 mt-1">{value || 'N/A'}</p>
    </div>
  );

  return (
    <div className="bg-white p-10 font-sans">
      <header className="mb-10 text-center border-b-4 border-blue-600 pb-6">
        <h1 className="text-4xl font-black text-gray-800 tracking-tight">INCIDENT REPORT</h1>
        <p className="text-sm font-bold text-gray-500 mt-2 uppercase tracking-widest">CONFIDENTIAL - FOR INTERNAL HSE REVIEW</p>
      </header>

      <main>
        <section className="mb-10">
          <h2 className="text-lg font-bold text-blue-700 uppercase tracking-wider border-b-2 border-blue-200 pb-2 mb-4">1. Event Identification</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
            <DetailItem label="Report ID" value={incident.id} />
            <DetailItem label="Title" value={fields.Title} />
            <DetailItem label="Date & Time" value={new Date(fields["Incident Date"]).toLocaleString()} />
            <DetailItem label="Category" value={fields.Category} />
            <DetailItem label="Site / Project" value={fields["Site / Project"]} />
            <DetailItem label="Precise Location" value={fields.Location} />
            <DetailItem label="Department" value={fields.Department} />
            <DetailItem label="Reporter" value={fields["Reporter ID"]} />
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-bold text-blue-700 uppercase tracking-wider border-b-2 border-blue-200 pb-2 mb-4">2. Narrative & Analysis</h2>
          <DetailItem label="Detailed Description" value={fields.Description} />
          <DetailItem label="Root Cause Analysis" value={fields["Root Cause"]} />
          <DetailItem label="Recommended Controls" value={fields["Recommended Controls"]} />
        </section>
        
        <section className="mb-10">
          <h2 className="text-lg font-bold text-red-700 uppercase tracking-wider border-b-2 border-red-200 pb-2 mb-4">3. Risk Assessment</h2>
          <div className="flex items-center gap-8 bg-gray-50 p-6 rounded-lg">
             <div className="text-center">
                <p className="text-xs font-bold text-gray-500">SEVERITY</p>
                <p className="text-3xl font-black text-gray-800">{fields.Severity}</p>
             </div>
             <p className="text-3xl font-light text-gray-400">×</p>
             <div className="text-center">
                <p className="text-xs font-bold text-gray-500">LIKELIHOOD</p>
                <p className="text-3xl font-black text-gray-800">{fields.Likelihood}</p>
             </div>
             <p className="text-3xl font-light text-gray-400">=</p>
             <div className={`text-center p-4 rounded-lg flex-1 ${riskInfo.color.replace('bg-', 'bg-opacity-10 ')}`}>
                <p className={`text-xs font-bold ${riskInfo.textColor.replace('text-', 'text-opacity-70 ')}`}>RISK SCORE</p>
                <p className={`text-3xl font-black ${riskInfo.textColor}`}>{riskScore}</p>
                <p className={`text-xs font-black ${riskInfo.textColor}`}>{riskInfo.level}</p>
             </div>
          </div>
        </section>

        <section className="page-break-before">
          <h2 className="text-lg font-bold text-blue-700 uppercase tracking-wider border-b-2 border-blue-200 pb-2 mb-4">4. Corrective Action & Closure</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
             <DetailItem label="Reviewer" value={fields.Reviewer} />
             <DetailItem label="Review Date" value={fields["Review Date"] ? new Date(fields["Review Date"]).toLocaleDateString() : undefined} />
             <DetailItem label="Assigned To" value={fields["Action Assigned To"]} />
             <DetailItem label="Action Due Date" value={fields["Action Due Date"]} />
             <DetailItem label="Closed By" value={fields["Closed By"]} />
             <DetailItem label="Closure Date" value={fields["Closure Date"] ? new Date(fields["Closure Date"]).toLocaleDateString() : undefined} />
             <div className="md:col-span-2"><DetailItem label="Corrective Action" value={fields["Corrective Action"]} /></div>
             <div className="md:col-span-2"><DetailItem label="Verification Comments" value={fields["Verification Comments"]} /></div>
          </div>
        </section>

        <section className="mt-10 page-break-before">
          <h2 className="text-lg font-bold text-blue-700 uppercase tracking-wider border-b-2 border-blue-200 pb-2 mb-4">5. Photographic Evidence</h2>
          <div>
             <h3 className="text-md font-bold text-red-600 mb-2">Before (Initial Evidence)</h3>
             <div className="grid grid-cols-2 gap-4">
                {fields.Attachments?.map((att, i) => (
                  <div key={i} className="border p-2 rounded-lg break-inside-avoid">
                    <img src={att.url} className="w-full object-contain mb-2" alt={`Initial Evidence ${i + 1}`} />
                    <p className="text-xs text-gray-600 text-center">{att.filename}</p>
                  </div>
                ))}
             </div>
          </div>
          <div className="mt-8">
             <h3 className="text-md font-bold text-green-600 mb-2">After (Corrective Action)</h3>
             <div className="grid grid-cols-2 gap-4">
               {fields["Verification Photos"]?.map((att, i) => (
                  <div key={i} className="border p-2 rounded-lg break-inside-avoid">
                    <img src={att.url} className="w-full object-contain mb-2" alt={`Verification Photo ${i + 1}`} />
                    <p className="text-xs text-gray-600 text-center">{att.filename}</p>
                  </div>
                ))}
             </div>
          </div>
        </section>
      </main>

      <footer className="mt-16 pt-6 border-t-2 border-gray-300 text-center">
        <p className="text-xs text-gray-500">HSE Guardian © {new Date().getFullYear()} | This document is computer-generated and is valid without a signature.</p>
      </footer>
    </div>
  );
};