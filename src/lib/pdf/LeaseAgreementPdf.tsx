import { Document, Page, Text, View } from '@react-pdf/renderer';
import { formatDate, formatInr } from '@/lib/format';
import type { Contract, ContractWithRelations } from '@/features/contracts/types';
import type { AppSettingsRow } from '@/types/database';
import { pdfStyles as s } from './shared';

type Props = {
  contract: Contract | ContractWithRelations;
  corporate: {
    legalName: string;
    gstin: string | null;
    billingAddress?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      pincode?: string;
    } | null;
  };
  vehicle: {
    registrationNumber: string;
    make: string;
    model: string;
    variant: string | null;
    year: number;
    chassisNo: string;
    engineNo: string;
  };
  company: Pick<
    AppSettingsRow,
    | 'company_name'
    | 'legal_name'
    | 'gstin'
    | 'address_line1'
    | 'address_line2'
    | 'city'
    | 'state'
    | 'pincode'
    | 'primary_contact_email'
    | 'primary_contact_phone'
  >;
};

function formatAddress(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(', ');
}

function Row({ label, value, alt }: { label: string; value: string; alt?: boolean }) {
  return (
    <View style={[s.tableRow, alt ? s.tableRowAlt : {}]}>
      <Text style={s.tableCellLabel}>{label}</Text>
      <Text style={s.tableCellValue}>{value}</Text>
    </View>
  );
}

export function LeaseAgreementPdf({ contract, corporate, vehicle, company }: Props) {
  const lesseeAddress = formatAddress([
    corporate.billingAddress?.line1,
    corporate.billingAddress?.line2,
    corporate.billingAddress?.city,
    corporate.billingAddress?.state,
    corporate.billingAddress?.pincode,
  ]);
  const lessorAddress = formatAddress([
    company.address_line1,
    company.address_line2,
    company.city,
    company.state,
    company.pincode,
  ]);

  return (
    <Document
      title={`Lease Agreement ${contract.contractNumber}`}
      author={company.legal_name}
      subject="Vehicle Lease Agreement"
    >
      <Page size="A4" style={s.page}>
        <View style={s.letterhead}>
          <View>
            <Text style={s.companyName}>{company.legal_name}</Text>
            {lessorAddress && <Text style={s.companyMeta}>{lessorAddress}</Text>}
            <Text style={s.companyMeta}>
              {[
                company.gstin ? `GSTIN: ${company.gstin}` : null,
                company.primary_contact_email,
                company.primary_contact_phone,
              ]
                .filter(Boolean)
                .join(' • ')}
            </Text>
          </View>
          <View>
            <Text style={[s.companyMeta, { textAlign: 'right' }]}>Contract no.</Text>
            <Text style={[s.companyName, { textAlign: 'right' }]}>{contract.contractNumber}</Text>
          </View>
        </View>

        <Text style={s.documentTitle}>Vehicle Lease Agreement</Text>
        <Text style={s.documentSubtitle}>
          Dated {formatDate(contract.startDate)} • Effective {formatDate(contract.startDate)} —{' '}
          {formatDate(contract.endDate)}
        </Text>

        <Text style={s.paragraph}>
          This Agreement is entered into between{' '}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{company.legal_name}</Text> ("Lessor") and{' '}
          <Text style={{ fontFamily: 'Helvetica-Bold' }}>{corporate.legalName}</Text> ("Lessee") for
          the lease of the vehicle described below, subject to the terms set out herein.
        </Text>

        <Text style={s.sectionTitle}>Parties</Text>
        <View style={s.twoCol}>
          <View style={s.twoColItem}>
            <Text style={s.fieldLabel}>Lessor</Text>
            <Text style={s.fieldValue}>{company.legal_name}</Text>
            {company.gstin && <Text style={s.fieldValue}>GSTIN: {company.gstin}</Text>}
            {lessorAddress && <Text style={s.fieldValue}>{lessorAddress}</Text>}
          </View>
          <View style={s.twoColItem}>
            <Text style={s.fieldLabel}>Lessee</Text>
            <Text style={s.fieldValue}>{corporate.legalName}</Text>
            {corporate.gstin && <Text style={s.fieldValue}>GSTIN: {corporate.gstin}</Text>}
            {lesseeAddress && <Text style={s.fieldValue}>{lesseeAddress}</Text>}
          </View>
        </View>

        <Text style={s.sectionTitle}>Vehicle</Text>
        <View style={s.table}>
          <Row
            label="Registration"
            value={`${vehicle.registrationNumber} — ${vehicle.make} ${vehicle.model}${
              vehicle.variant ? ` ${vehicle.variant}` : ''
            } (${vehicle.year})`}
          />
          <Row label="Chassis no." value={vehicle.chassisNo} alt />
          <Row label="Engine no." value={vehicle.engineNo} />
        </View>

        <Text style={s.sectionTitle}>Commercial terms</Text>
        <View style={s.table}>
          <Row label="Tenure" value={`${contract.tenureMonths} months`} />
          <Row
            label="Period"
            value={`${formatDate(contract.startDate)} to ${formatDate(contract.endDate)}`}
            alt
          />
          <Row label="Monthly rental" value={formatInr(contract.monthlyRental)} />
          <Row label="Security deposit" value={formatInr(contract.securityDeposit)} alt />
          {contract.kmCapPerMonth !== null && (
            <Row
              label="Kilometre cap"
              value={`${contract.kmCapPerMonth.toLocaleString('en-IN')} km / month`}
            />
          )}
          <Row
            label="Fuel responsibility"
            value={contract.fuelResponsibility === 'client' ? 'Lessee' : 'Lessor'}
            alt
          />
          <Row
            label="Insurance responsibility"
            value={contract.insuranceResponsibility === 'client' ? 'Lessee' : 'Lessor'}
          />
        </View>

        <Text style={s.sectionTitle}>Standard terms</Text>
        <Text style={s.paragraph}>
          1. The Lessee shall use the Vehicle solely for lawful, commercial purposes and ensure
          compliance with all applicable traffic and tax laws.
        </Text>
        <Text style={s.paragraph}>
          2. Monthly rental is payable in advance by the 5th of each month against a GST-compliant
          invoice issued by the Lessor.
        </Text>
        <Text style={s.paragraph}>
          3. The Lessee shall not sub-lease, transfer, or grant any third-party rights over the
          Vehicle without prior written consent of the Lessor.
        </Text>
        <Text style={s.paragraph}>
          4. Either party may terminate this Agreement with thirty (30) days' written notice.
          Outstanding dues and pro-rated rental remain payable on termination.
        </Text>

        {contract.notes && (
          <>
            <Text style={s.sectionTitle}>Additional notes</Text>
            <Text style={s.paragraph}>{contract.notes}</Text>
          </>
        )}

        <View style={s.signatureBlock}>
          <View style={s.signaturePane}>
            <View style={s.signatureLine} />
            <Text style={s.signatureLabel}>For {company.legal_name} (Lessor)</Text>
          </View>
          <View style={s.signaturePane}>
            <View style={s.signatureLine} />
            <Text style={s.signatureLabel}>For {corporate.legalName} (Lessee)</Text>
          </View>
        </View>

        <Text style={s.footer} fixed>
          {company.legal_name} • Lease Agreement {contract.contractNumber}
        </Text>
      </Page>
    </Document>
  );
}
