"use client";

import { useEffect, useState } from "react";
import { touristApi, blockchainApi } from "@/lib/api";
import type { Tourist, BlockchainDID } from "@/types";
import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, CreditCard, RefreshCw, ExternalLink, Copy, CheckCircle, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function DigitalIDPage() {
  const { user } = useAuthStore();
  const [tourist, setTourist] = useState<Tourist | null>(null);
  const [did, setDID] = useState<BlockchainDID | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      touristApi.getMe().then((r) => setTourist(r.data)),
      blockchainApi.getDID(user?.id ?? "").then((r) => setDID(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [user?.id]);

  async function handleVerify() {
    if (!did) return;
    setVerifying(true);
    try {
      await blockchainApi.verify(did.did_address);
      setVerified(true);
      toast.success("DID verified on-chain ✓");
    } catch {
      toast.error("Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  function copyDID() {
    if (!did?.did_address) return;
    navigator.clipboard.writeText(did.did_address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const qrData = tourist
    ? JSON.stringify({
        id: tourist.id,
        name: tourist.full_name,
        nationality: tourist.nationality,
        passport: tourist.passport_number,
        did: did?.did_address ?? null,
        issued: new Date().toISOString(),
      })
    : "";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-ts-navy">Digital Identity</h1>
        <p className="text-xs text-ts-slate/60 mt-0.5">
          Your blockchain-verified tourist identity card — scan or share with authorities
        </p>
      </div>

      <div className="grid grid-cols-5 gap-6">
        {/* ID Card */}
        <div className="col-span-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-ts-navy to-ts-teal rounded-2xl p-6 text-white shadow-xl relative overflow-hidden"
          >
            {/* Card background pattern */}
            <div className="absolute inset-0 opacity-5"
              style={{ backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)", backgroundSize: "10px 10px" }}
            />
            {/* Header */}
            <div className="relative z-10 flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-5 bg-white/20 rounded flex items-center justify-center overflow-hidden">
                  <div className="w-full h-1.5 bg-ts-saffron" />
                  <div className="w-full h-1.5 bg-white" />
                  <div className="w-full h-1.5 bg-ts-green" />
                </div>
                <span className="text-xs font-bold opacity-80">GOVT. OF INDIA</span>
              </div>
              <div className="flex items-center gap-1">
                <CreditCard className="w-4 h-4 opacity-60" />
                <span className="text-xs opacity-60">TOURIST ID</span>
              </div>
            </div>

            <div className="relative z-10 flex gap-6">
              {/* QR Code */}
              <div className="bg-white rounded-xl p-2 w-32 h-32 flex items-center justify-center shrink-0">
                {loading ? (
                  <Skeleton className="w-24 h-24" />
                ) : (
                  <QRCodeSVG
                    value={qrData || "https://toursafe.in"}
                    size={112}
                    level="H"
                    includeMargin={false}
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 space-y-2">
                {loading ? (
                  <>
                    <Skeleton className="h-6 w-40 bg-white/20" />
                    <Skeleton className="h-4 w-28 bg-white/20" />
                    <Skeleton className="h-4 w-32 bg-white/20" />
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold tracking-wide">{tourist?.full_name ?? "—"}</h2>
                    <Field label="Nationality" value={tourist?.nationality ?? "—"} />
                    <Field label="Passport" value={tourist?.passport_number ?? "—"} />
                    <Field label="Tourist ID" value={tourist?.id?.slice(0, 12).toUpperCase() ?? "—"} />
                    <Field label="Valid Until" value="31 DEC 2025" />
                  </>
                )}
              </div>
            </div>

            {/* DID Badge */}
            {did && (
              <div className="relative z-10 mt-4 flex items-center gap-2 bg-white/10 rounded-xl p-2.5">
                <Fingerprint className="w-4 h-4 opacity-70 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs opacity-60">Blockchain DID</p>
                  <p className="text-xs font-mono truncate opacity-80">{did.did_address}</p>
                </div>
                {verified ? (
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                ) : null}
              </div>
            )}

            {/* Bottom strip */}
            <div className="relative z-10 mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
              <div className="flex gap-1">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/20" />
                ))}
              </div>
              <span className="text-xs opacity-40">TourSafe Digital ID v2</span>
            </div>
          </motion.div>
        </div>

        {/* Actions panel */}
        <div className="col-span-2 space-y-4">
          {/* Verify */}
          <div className="bg-white rounded-xl border border-ts-mid p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-ts-green" />
              <h3 className="font-semibold text-ts-navy text-sm">Blockchain Verification</h3>
            </div>
            {did ? (
              <>
                <div className="mb-3 text-xs text-ts-slate/60 space-y-1">
                  <p>Network: <span className="font-medium text-ts-navy">Polygon Mumbai</span></p>
                  <p>IPFS Hash: <span className="font-mono text-ts-navy">{did.ipfs_hash?.slice(0, 20)}…</span></p>
                  <p>Created: <span className="font-medium text-ts-navy">{new Date(did.created_at).toLocaleDateString()}</span></p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-ts-green text-white text-xs px-3 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {verifying ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : verified ? (
                      <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    )}
                    {verified ? "Verified" : verifying ? "Verifying…" : "Verify On-Chain"}
                  </button>
                  <button
                    onClick={() => window.open(`https://mumbai.polygonscan.com/address/${did.did_address}`, "_blank")}
                    className="p-2 border border-ts-mid rounded-lg text-ts-slate hover:bg-ts-light transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : loading ? (
              <Skeleton className="h-20" />
            ) : (
              <p className="text-xs text-ts-slate/50">No DID assigned yet. Contact authorities to register.</p>
            )}
          </div>

          {/* Copy DID */}
          {did && (
            <div className="bg-white rounded-xl border border-ts-mid p-4">
              <h3 className="text-xs font-semibold text-ts-navy mb-2">DID Address</h3>
              <div className="flex items-center gap-2 bg-ts-light rounded-lg px-3 py-2">
                <p className="text-xs font-mono text-ts-slate flex-1 truncate">{did.did_address}</p>
                <button onClick={copyDID} className="shrink-0 text-ts-teal">
                  {copied ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* What is this? */}
          <div className="bg-ts-light rounded-xl border border-ts-mid p-4 text-xs text-ts-slate/60 space-y-1.5">
            <p className="font-semibold text-ts-navy text-xs">About your Digital ID</p>
            <p>Your identity is stored on Polygon blockchain ensuring tamper-proof verification.</p>
            <p>Authorities can scan your QR code for instant verification, even offline.</p>
            <p>Data stored on IPFS — decentralized and censorship-resistant.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs opacity-50">{label}: </span>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  );
}
