import React from "react";
import { useParams, Link } from "wouter";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Award, CheckCircle2 } from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export default function CertificateVerify() {
  const { credentialId } = useParams<{ credentialId: string }>();
  const [data, setData] = React.useState<any>(null);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    fetch(`${API_BASE}/api/certificates/verify/${encodeURIComponent(credentialId || "")}`)
      .then(async (response) => {
        if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Certificate not found");
        return response.json();
      })
      .then(setData)
      .catch((err) => setError(err.message));
  }, [credentialId]);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-4xl px-4 py-16">
        {error ? (
          <div className="rounded-xl border bg-card p-10 text-center">
            <Award className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h1 className="text-2xl font-bold font-serif">Certificate not found</h1>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <Button asChild className="mt-6"><Link href="/">Return home</Link></Button>
          </div>
        ) : data ? (
          <div className="rounded-xl border bg-card p-10 shadow-sm">
            <div className="border-4 border-primary/20 p-10 text-center">
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-600" />
              <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Verified Certificate</p>
              <h1 className="mt-4 text-4xl font-bold font-serif">{data.courseTitle}</h1>
              <p className="mt-6 text-muted-foreground">Issued by {data.instructorName}</p>
              <p className="mt-2 text-sm">Credential ID: <span className="font-mono">{data.credentialId}</span></p>
              <p className="mt-2 text-sm">Completion Date: {new Date(data.issuedAt).toLocaleDateString()}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">Checking certificate...</div>
        )}
      </div>
    </PublicLayout>
  );
}
