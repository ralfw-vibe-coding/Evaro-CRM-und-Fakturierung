import { describe, expect, it } from "vitest";
import { beispiel, ladeFachlogik, ladeViewer } from "./fachlogik";

/**
 * XFactViewer liest XRechnungen (CII). Geprüft wird zweierlei:
 *   - Was XFact erzeugt, liest der Viewer vollständig zurück.
 *   - Eine handgeschriebene XRechnung mit Angaben, die XFact nicht erzeugt
 *     (Nachlässe, Anzahlung, Skonto, Anhang, Lieferanschrift).
 */

const Viewer = ladeViewer();
const XFact = ladeFachlogik();
const mitEmail = { empfaenger: { email: "rechnung@kunde.example" } };

/** XFact baut aus einer aufgezeichneten KI-Antwort die XML; der Viewer liest sie. */
function hinUndZurueck(name: string, ergaenzungen: object = {}, befund = beispiel(name).befund, ersetzt: object = {}) {
  const rechnung = XFact.baueRechnung(befund, { ...mitEmail, ...ergaenzungen, ...ersetzt });
  expect(XFact.pruefeRechnung(rechnung)).toEqual([]);
  return { rechnung, gelesen: Viewer.leseXRechnung(XFact.erzeugeXml(rechnung)) };
}

describe("liest zurück, was XFact erzeugt", () => {
  it("Kreditkarte und Rabatt auf eine Position", () => {
    const befund = JSON.parse(JSON.stringify(beispiel("INV753").befund));
    Object.assign(befund.positionen[0], { einzelpreis: 800, nachlass: 23, nachlassGrund: "Treue", gesamt: 777 });
    const { gelesen } = hinUndZurueck("INV753", {}, befund, { zahlungsart: "kreditkarte", empfaenger: { email: "rechnung@kunde.example", karte: "4242" } });
    expect(gelesen.zahlung.mittel).toEqual([expect.objectContaining({ art: "54", karte: "4242", iban: null })]);
    expect(gelesen.positionen[0]).toMatchObject({ einzelpreis: 800, gesamt: 777,
      nachlaesseZuschlaege: [{ zuschlag: false, betrag: 23, grund: "Treue", kategorie: null, satz: null }] });
    expect(Viewer.rechneNach(gelesen)).toEqual([]);
  });

  it("INV 747: Kopf, Parteien, sieben Positionen, Steuer, Summen", () => {
    const { rechnung, gelesen } = hinUndZurueck("INV747");
    expect(gelesen).toMatchObject({
      syntax: "CII", nummer: rechnung.nummer, art: "380", datum: rechnung.datum, waehrung: "EUR",
      kaeuferreferenz: rechnung.kaeuferreferenz,
    });
    expect(gelesen.profil).toContain("xrechnung_3.0");
    expect(gelesen.absender).toMatchObject({
      name: rechnung.absender.name, plz: rechnung.absender.plz, ort: rechnung.absender.ort, land: rechnung.absender.land,
      ustId: rechnung.absender.ustId, adresseElektronisch: rechnung.absender.email,
      kontakt: { name: rechnung.absender.kontakt, telefon: rechnung.absender.telefon, email: rechnung.absender.email },
    });
    expect(gelesen.empfaenger).toMatchObject({ name: rechnung.empfaenger.name, adresseElektronisch: "rechnung@kunde.example" });
    expect(gelesen.positionen.map((p: any) => [p.menge, p.einheit, p.einzelpreis, p.gesamt, p.von, p.bis]))
      .toEqual(rechnung.positionen.map((p: any) => [p.menge, p.einheitCode, p.einzelpreis, p.gesamt, p.von, p.bis]));
    const summen = XFact.summenDerRechnung(rechnung);
    expect(gelesen.summen).toMatchObject({ netto: summen.netto, steuer: summen.steuer, brutto: summen.brutto, zahlbetrag: summen.brutto });
    expect(gelesen.steuer[0]).toMatchObject({ kategorie: "AE", satz: 0, befreiungscode: "VATEX-EU-AE" });
    expect(gelesen.zahlung).toMatchObject({ faellig: rechnung.faellig, verwendungszweck: rechnung.nummer });
    expect(gelesen.zahlung.mittel).toEqual([expect.objectContaining({ art: "58", iban: rechnung.bank.iban })]);
    expect(Viewer.rechneNach(gelesen)).toEqual([]);
  });

  it("INV 742: Leitweg-ID als Käuferreferenz", () => {
    const { gelesen } = hinUndZurueck("INV742", { leistungsdatum: "2026-07-16", leitwegId: "04011000-1234512345-06" });
    expect(gelesen.kaeuferreferenz).toBe("04011000-1234512345-06");
  });

  it("Lastschrift: Gläubiger-ID, Konto des Kunden, Mandat", () => {
    const { gelesen } = hinUndZurueck("INV753", {
      zahlungsart: "lastschrift",
      absender: { glaeubigerId: "DE98ZZZ09999999999" },
      empfaenger: { email: "rechnung@kunde.example", iban: "DE02120300000000202051", mandatsreferenz: "M-4711" },
    });
    expect(gelesen.zahlung).toMatchObject({ glaeubigerId: "DE98ZZZ09999999999", mandatsreferenz: "M-4711" });
    expect(gelesen.zahlung.mittel).toEqual([expect.objectContaining({ art: "59", kundenIban: "DE02120300000000202051", iban: null })]);
  });
});

/** Eine XRechnung mit Angaben, die XFact nicht erzeugt */
const MUSTER = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext><ram:GuidelineSpecifiedDocumentContextParameter>
    <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</ram:ID>
  </ram:GuidelineSpecifiedDocumentContextParameter></rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>R-2026-77</ram:ID><ram:TypeCode>384</ram:TypeCode>
    <ram:IssueDateTime><udt:DateTimeString format="102">20261001</udt:DateTimeString></ram:IssueDateTime>
    <ram:IncludedNote><ram:Content>Vielen Dank für Ihren Auftrag.</ram:Content></ram:IncludedNote>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>1</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:SellerAssignedID>A-100</ram:SellerAssignedID><ram:Name>Schrauben &amp; Dübel</ram:Name></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice>
        <ram:ChargeAmount>12.50</ram:ChargeAmount><ram:BasisQuantity unitCode="C62">100</ram:BasisQuantity>
      </ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="C62">400</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>19</ram:RateApplicablePercent></ram:ApplicableTradeTax>
        <ram:SpecifiedTradeAllowanceCharge>
          <ram:ChargeIndicator><udt:Indicator>false</udt:Indicator></ram:ChargeIndicator>
          <ram:ActualAmount>5.00</ram:ActualAmount><ram:Reason>Mengenrabatt</ram:Reason>
        </ram:SpecifiedTradeAllowanceCharge>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>45.00</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument><ram:LineID>2</ram:LineID></ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct><ram:Name>Montage</ram:Name><ram:Description>Zeile 1
Zeile 2</ram:Description></ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement><ram:NetPriceProductTradePrice><ram:ChargeAmount>60</ram:ChargeAmount></ram:NetPriceProductTradePrice></ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery><ram:BilledQuantity unitCode="HUR">2.5</ram:BilledQuantity></ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>19</ram:RateApplicablePercent></ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation><ram:LineTotalAmount>150.00</ram:LineTotalAmount></ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>
    <ram:ApplicableHeaderTradeAgreement>
      <ram:BuyerReference>991-12345-06</ram:BuyerReference>
      <ram:SellerTradeParty>
        <ram:Name>Muster Handel GmbH</ram:Name>
        <ram:SpecifiedLegalOrganization><ram:ID>HRB 12345</ram:ID><ram:TradingBusinessName>Muster Handel</ram:TradingBusinessName></ram:SpecifiedLegalOrganization>
        <ram:DefinedTradeContact><ram:PersonName>Erika Muster</ram:PersonName>
          <ram:TelephoneUniversalCommunication><ram:CompleteNumber>040 1234</ram:CompleteNumber></ram:TelephoneUniversalCommunication>
          <ram:EmailURIUniversalCommunication><ram:URIID>erika@muster.example</ram:URIID></ram:EmailURIUniversalCommunication>
        </ram:DefinedTradeContact>
        <ram:PostalTradeAddress><ram:PostcodeCode>20095</ram:PostcodeCode><ram:LineOne>Hauptstr. 1</ram:LineOne><ram:LineTwo>Hof 2</ram:LineTwo>
          <ram:CityName>Hamburg</ram:CityName><ram:CountryID>DE</ram:CountryID></ram:PostalTradeAddress>
        <ram:URIUniversalCommunication><ram:URIID schemeID="EM">rechnung@muster.example</ram:URIID></ram:URIUniversalCommunication>
        <ram:SpecifiedTaxRegistration><ram:ID schemeID="VA">DE123456789</ram:ID></ram:SpecifiedTaxRegistration>
        <ram:SpecifiedTaxRegistration><ram:ID schemeID="FC">12/345/67890</ram:ID></ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      <ram:BuyerTradeParty>
        <ram:Name>Bureau Exemple SARL</ram:Name>
        <ram:PostalTradeAddress><ram:PostcodeCode>75001</ram:PostcodeCode><ram:CityName>Paris</ram:CityName><ram:CountryID>FR</ram:CountryID></ram:PostalTradeAddress>
        <ram:URIUniversalCommunication><ram:URIID schemeID="EM">factures@exemple.example</ram:URIID></ram:URIUniversalCommunication>
      </ram:BuyerTradeParty>
      <ram:BuyerOrderReferencedDocument><ram:IssuerAssignedID>PO-9</ram:IssuerAssignedID></ram:BuyerOrderReferencedDocument>
      <ram:AdditionalReferencedDocument>
        <ram:IssuerAssignedID>Anl-1</ram:IssuerAssignedID><ram:TypeCode>916</ram:TypeCode><ram:Name>Stundenzettel</ram:Name>
        <ram:AttachmentBinaryObject mimeCode="text/plain" filename="stunden.txt">SGFsbG8=</ram:AttachmentBinaryObject>
      </ram:AdditionalReferencedDocument>
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ShipToTradeParty><ram:Name>Lager Nord</ram:Name>
        <ram:PostalTradeAddress><ram:PostcodeCode>24103</ram:PostcodeCode><ram:CityName>Kiel</ram:CityName><ram:CountryID>DE</ram:CountryID></ram:PostalTradeAddress>
      </ram:ShipToTradeParty>
      <ram:ActualDeliverySupplyChainEvent><ram:OccurrenceDateTime><udt:DateTimeString format="102">20260929</udt:DateTimeString></ram:OccurrenceDateTime></ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:PaymentReference>R-2026-77</ram:PaymentReference>
      <ram:InvoiceCurrencyCode>EUR</ram:InvoiceCurrencyCode>
      <ram:SpecifiedTradeSettlementPaymentMeans><ram:TypeCode>58</ram:TypeCode>
        <ram:PayeePartyCreditorFinancialAccount><ram:IBANID>DE89370400440532013000</ram:IBANID><ram:AccountName>Muster Handel GmbH</ram:AccountName></ram:PayeePartyCreditorFinancialAccount>
      </ram:SpecifiedTradeSettlementPaymentMeans>
      <ram:ApplicableTradeTax><ram:CalculatedAmount>34.20</ram:CalculatedAmount><ram:TypeCode>VAT</ram:TypeCode>
        <ram:BasisAmount>180.00</ram:BasisAmount><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>19</ram:RateApplicablePercent></ram:ApplicableTradeTax>
      <ram:SpecifiedTradeAllowanceCharge>
        <ram:ChargeIndicator><udt:Indicator>false</udt:Indicator></ram:ChargeIndicator>
        <ram:ActualAmount>20.00</ram:ActualAmount><ram:Reason>Treuerabatt</ram:Reason>
        <ram:CategoryTradeTax><ram:TypeCode>VAT</ram:TypeCode><ram:CategoryCode>S</ram:CategoryCode><ram:RateApplicablePercent>19</ram:RateApplicablePercent></ram:CategoryTradeTax>
      </ram:SpecifiedTradeAllowanceCharge>
      <ram:SpecifiedTradePaymentTerms>
        <ram:Description>#SKONTO#TAGE=14#PROZENT=2.00#
Zahlbar innerhalb 30 Tagen netto.</ram:Description>
        <ram:DueDateDateTime><udt:DateTimeString format="102">20261031</udt:DateTimeString></ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>195.00</ram:LineTotalAmount>
        <ram:AllowanceTotalAmount>20.00</ram:AllowanceTotalAmount>
        <ram:TaxBasisTotalAmount>175.00</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="EUR">33.25</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>208.25</ram:GrandTotalAmount>
        <ram:TotalPrepaidAmount>100.00</ram:TotalPrepaidAmount>
        <ram:DuePayableAmount>108.25</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

describe("eine XRechnung mit allem, was XFact nicht erzeugt", () => {
  const r = Viewer.leseXRechnung(MUSTER);

  it("Kopf, Bemerkung, Referenzen, Leistungsdatum", () => {
    expect(r).toMatchObject({ nummer: "R-2026-77", art: "384", datum: "2026-10-01", kaeuferreferenz: "991-12345-06",
      bestellnummer: "PO-9", leistungsdatum: "2026-09-29" });
    expect(Viewer.bedeutung("rechnungsart", r.art)).toBe("Rechnungskorrektur");
    expect(r.bemerkungen).toEqual([{ thema: null, text: "Vielen Dank für Ihren Auftrag." }]);
  });

  it("Parteien mit Kontakt, Register, Steuernummer; Lieferanschrift; Ausland", () => {
    expect(r.absender).toMatchObject({
      name: "Muster Handel GmbH", handelsname: "Muster Handel", register: "HRB 12345", adresse: ["Hauptstr. 1", "Hof 2"],
      ustId: "DE123456789", steuernummer: "12/345/67890", adresseElektronisch: "rechnung@muster.example",
      kontakt: { name: "Erika Muster", telefon: "040 1234", email: "erika@muster.example" },
    });
    expect(r.empfaenger).toMatchObject({ name: "Bureau Exemple SARL", land: "FR", kontakt: null });
    expect(Viewer.landName("FR")).toBe("Frankreich");
    expect(r.lieferanschrift).toMatchObject({ name: "Lager Nord", ort: "Kiel" });
  });

  it("Positionen mit Preisbasis, Nachlass, mehrzeiliger Beschreibung", () => {
    expect(r.positionen[0]).toMatchObject({ nr: "1", name: "Schrauben & Dübel", artikelnummer: "A-100", menge: 400, einheit: "C62",
      einzelpreis: 12.5, preisbasis: 100, gesamt: 45 });
    expect(r.positionen[0].nachlaesseZuschlaege).toEqual([{ zuschlag: false, betrag: 5, grund: "Mengenrabatt", kategorie: null, satz: null }]);
    expect(r.positionen[1]).toMatchObject({ menge: 2.5, einheit: "HUR", beschreibung: "Zeile 1\nZeile 2" });
    expect(Viewer.bedeutung("einheit", "HUR")).toBe("Stunde");
    expect(Viewer.bedeutung("einheit", "XYZ")).toBe("XYZ");
  });

  it("Nachlass auf die Rechnung, Anzahlung, Summen", () => {
    expect(r.nachlaesseZuschlaege).toEqual([{ zuschlag: false, betrag: 20, grund: "Treuerabatt", kategorie: "S", satz: 19 }]);
    expect(r.summen).toEqual({ positionen: 195, zuschlaege: null, nachlaesse: 20, netto: 175, steuer: 33.25, brutto: 208.25,
      gezahlt: 100, rundung: null, zahlbetrag: 108.25 });
  });

  it("Zahlung: Skonto wird lesbar", () => {
    expect(r.zahlung).toMatchObject({ faellig: "2026-10-31", verwendungszweck: "R-2026-77" });
    // 14 Tage ab 01.10.2026; 2 % vom Zahlbetrag 108,25 €
    expect(Viewer.lesbareBedingungen(r.zahlung.bedingungen, r))
      .toBe(`${Viewer.TEXTE.skonto("2,00", 14, "15.10.2026", Viewer.alsBetrag(106.09))}\nZahlbar innerhalb 30 Tagen netto.`);
    expect(Viewer.lesbareBedingungen("#SKONTO#TAGE=10#PROZENT=3.00#BASISBETRAG=100.00#", r))
      .toBe(Viewer.TEXTE.skonto("3,00", 10, "11.10.2026", Viewer.alsBetrag(97)));
  });

  it("Anhang: eingebettete Datei", () => {
    expect(r.anhaenge).toEqual([{ kennung: "Anl-1", beschreibung: "Stundenzettel", link: null, dateiname: "stunden.txt",
      mime: "text/plain", inhalt: "SGFsbG8=" }]);
  });

  it("Nachrechnen findet die Abweichung bei der Steuer", () => {
    // Steuerbasis 180 statt 175 (Netto) – die Steuer ist zu hoch
    const t = Viewer.TEXTE;
    expect(Viewer.rechneNach(r)).toEqual([
      t.abweichung(t.pruefgegenstand.steuerSumme, Viewer.alsBetrag(34.2), Viewer.alsBetrag(33.25)),
    ]);
    const korrigiert = MUSTER.replace("<ram:CalculatedAmount>34.20", "<ram:CalculatedAmount>33.25").replace("<ram:BasisAmount>180.00", "<ram:BasisAmount>175.00");
    expect(Viewer.rechneNach(Viewer.leseXRechnung(korrigiert))).toEqual([]);
  });
});

describe("was keine XRechnung in CII ist", () => {
  it("kein XML", () => {
    expect(() => Viewer.leseXRechnung("das ist kein XML")).toThrow(Viewer.TEXTE.keinXml);
  });

  it("UBL: noch nicht unterstützt", () => {
    const ubl = '<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"><ID>1</ID></Invoice>';
    expect(() => Viewer.leseXRechnung(ubl)).toThrow(Viewer.TEXTE.ublNochNicht);
  });

  it("anderes XML", () => {
    expect(() => Viewer.leseXRechnung("<bestellung><nr>1</nr></bestellung>")).toThrow(Viewer.TEXTE.keineXRechnung);
  });
});
