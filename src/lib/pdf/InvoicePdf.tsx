import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatDate, formatInrPlain } from '@/lib/format';
import { formatInrInWords } from '@/lib/numberToWords';
import type { Invoice, InvoiceLineItem } from '@/features/invoices/types';
import type { AppSettingsRow } from '@/types/database';
import { pdfStyles } from './shared';

type Props = {
  invoice: Invoice;
  lineItems: InvoiceLineItem[];
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
  company: Pick<
    AppSettingsRow,
    | 'company_name'
    | 'legal_name'
    | 'gstin'
    | 'pan'
    | 'state'
    | 'state_code'
    | 'address_line1'
    | 'address_line2'
    | 'city'
    | 'pincode'
    | 'primary_contact_email'
    | 'primary_contact_phone'
  >;
};

const local = StyleSheet.create({
  badgeOrig: {
    alignSelf: 'flex-start',
    padding: '2 6',
    fontSize: 8,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#0f172a',
    borderRadius: 2,
    marginBottom: 8,
  },
  totals: {
    marginTop: 8,
    alignSelf: 'flex-end',
    width: '50%',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#cbd5e1',
  },
  totalsRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#0f172a',
    marginTop: 2,
    fontFamily: 'Helvetica-Bold',
  },
  th: {
    fontFamily: 'Helvetica-Bold',
    backgroundColor: '#f1f5f9',
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 9,
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  td: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    fontSize: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  row: { flexDirection: 'row' },
  col1: { width: '6%' },
  col2: { width: '38%' },
  col3: { width: '10%' },
  col4: { width: '8%', textAlign: 'right' },
  col5: { width: '12%', textAlign: 'right' },
  col6: { width: '14%', textAlign: 'right' },
  col7: { width: '12%', textAlign: 'right' },
});

function formatAddress(parts: (string | null | undefined)[]) {
  return parts.filter(Boolean).join(', ');
}

export function InvoicePdf({ invoice, lineItems, corporate, company }: Props) {
  const inter = invoice.isInterState;
  const subtotal = formatInrPlain(invoice.subtotal);
  const total = formatInrPlain(invoice.total);
  const inWords = formatInrInWords(invoice.total);

  const supplierAddr = formatAddress([
    company.address_line1,
    company.address_line2,
    company.city,
    company.state,
    company.pincode,
  ]);
  const recipientAddr = formatAddress([
    corporate.billingAddress?.line1,
    corporate.billingAddress?.line2,
    corporate.billingAddress?.city,
    corporate.billingAddress?.state,
    corporate.billingAddress?.pincode,
  ]);

  return (
    <Document
      title={`Tax Invoice ${invoice.invoiceNumber}`}
      author={company.legal_name}
      subject="GST Tax Invoice"
    >
      <Page size="A4" style={pdfStyles.page}>
        <Text style={local.badgeOrig}>ORIGINAL FOR RECIPIENT</Text>

        <View style={pdfStyles.letterhead}>
          <View>
            <Text style={pdfStyles.companyName}>{company.legal_name}</Text>
            {supplierAddr && <Text style={pdfStyles.companyMeta}>{supplierAddr}</Text>}
            <Text style={pdfStyles.companyMeta}>
              {[
                company.gstin ? `GSTIN: ${company.gstin}` : null,
                company.pan ? `PAN: ${company.pan}` : null,
                company.state_code ? `State code: ${company.state_code}` : null,
              ]
                .filter(Boolean)
                .join(' • ')}
            </Text>
            <Text style={pdfStyles.companyMeta}>
              {[company.primary_contact_email, company.primary_contact_phone]
                .filter(Boolean)
                .join(' • ')}
            </Text>
          </View>
          <View>
            <Text style={[pdfStyles.companyMeta, { textAlign: 'right' }]}>Invoice no.</Text>
            <Text style={[pdfStyles.companyName, { textAlign: 'right' }]}>
              {invoice.invoiceNumber}
            </Text>
            <Text style={[pdfStyles.companyMeta, { textAlign: 'right', marginTop: 4 }]}>
              Issued {formatDate(invoice.issueDate)}
            </Text>
            <Text style={[pdfStyles.companyMeta, { textAlign: 'right' }]}>
              Due {formatDate(invoice.dueDate)}
            </Text>
          </View>
        </View>

        <Text style={pdfStyles.documentTitle}>Tax Invoice</Text>
        <Text style={pdfStyles.documentSubtitle}>
          Billing period {formatDate(invoice.billingPeriodStart)} —{' '}
          {formatDate(invoice.billingPeriodEnd)}
          {invoice.placeOfSupplyStateCode
            ? ` • Place of supply: ${invoice.placeOfSupplyStateCode}`
            : ''}
        </Text>

        <View style={pdfStyles.twoCol}>
          <View style={pdfStyles.twoColItem}>
            <Text style={pdfStyles.fieldLabel}>Bill to</Text>
            <Text style={[pdfStyles.fieldValue, { fontFamily: 'Helvetica-Bold' }]}>
              {corporate.legalName}
            </Text>
            {corporate.gstin && <Text style={pdfStyles.fieldValue}>GSTIN: {corporate.gstin}</Text>}
            {recipientAddr && <Text style={pdfStyles.fieldValue}>{recipientAddr}</Text>}
          </View>
          <View style={pdfStyles.twoColItem}>
            <Text style={pdfStyles.fieldLabel}>Supplier</Text>
            <Text style={[pdfStyles.fieldValue, { fontFamily: 'Helvetica-Bold' }]}>
              {company.legal_name}
            </Text>
            {company.gstin && <Text style={pdfStyles.fieldValue}>GSTIN: {company.gstin}</Text>}
            {company.state_code && (
              <Text style={pdfStyles.fieldValue}>State code: {company.state_code}</Text>
            )}
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <View style={local.row}>
            <Text style={[local.th, local.col1]}>#</Text>
            <Text style={[local.th, local.col2]}>Description</Text>
            <Text style={[local.th, local.col3]}>HSN/SAC</Text>
            <Text style={[local.th, local.col4]}>Qty</Text>
            <Text style={[local.th, local.col5]}>Unit (₹)</Text>
            <Text style={[local.th, local.col6]}>Taxable (₹)</Text>
            <Text style={[local.th, local.col7]}>GST %</Text>
          </View>
          {lineItems.map((li, idx) => (
            <View key={li.id} style={local.row}>
              <Text style={[local.td, local.col1]}>{idx + 1}</Text>
              <Text style={[local.td, local.col2]}>{li.description}</Text>
              <Text style={[local.td, local.col3]}>{li.hsnCode}</Text>
              <Text style={[local.td, local.col4]}>{Number(li.quantity)}</Text>
              <Text style={[local.td, local.col5]}>{formatInrPlain(li.unitPrice)}</Text>
              <Text style={[local.td, local.col6]}>{formatInrPlain(li.taxableValue)}</Text>
              <Text style={[local.td, local.col7]}>{Number(li.gstRate)}%</Text>
            </View>
          ))}
        </View>

        <View style={local.totals}>
          <View style={local.totalsRow}>
            <Text>Subtotal (taxable)</Text>
            <Text>₹ {subtotal}</Text>
          </View>
          {inter ? (
            <View style={local.totalsRow}>
              <Text>IGST</Text>
              <Text>₹ {formatInrPlain(invoice.igst)}</Text>
            </View>
          ) : (
            <>
              <View style={local.totalsRow}>
                <Text>CGST</Text>
                <Text>₹ {formatInrPlain(invoice.cgst)}</Text>
              </View>
              <View style={local.totalsRow}>
                <Text>SGST</Text>
                <Text>₹ {formatInrPlain(invoice.sgst)}</Text>
              </View>
            </>
          )}
          <View style={local.totalsRowFinal}>
            <Text>Total payable</Text>
            <Text>₹ {total}</Text>
          </View>
        </View>

        <Text style={[pdfStyles.fieldLabel, { marginTop: 14 }]}>Amount in words</Text>
        <Text style={pdfStyles.paragraph}>{inWords}</Text>

        {invoice.notes && (
          <>
            <Text style={[pdfStyles.fieldLabel, { marginTop: 8 }]}>Notes</Text>
            <Text style={pdfStyles.paragraph}>{invoice.notes}</Text>
          </>
        )}

        <Text style={[pdfStyles.paragraph, { marginTop: 12, fontSize: 8, color: '#475569' }]}>
          This is a computer-generated invoice and does not require a physical signature.
        </Text>

        <Text style={pdfStyles.footer} fixed>
          {company.legal_name} • Tax Invoice {invoice.invoiceNumber}
        </Text>
      </Page>
    </Document>
  );
}
