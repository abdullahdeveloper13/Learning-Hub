import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useGetCertificates } from "@workspace/api-client-react/api";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Download, Share2 } from "lucide-react";

export default function Certificates() {
  const { data: certificates, isLoading } = useGetCertificates();

  return (
    <AppLayout requiredRole="student">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-serif mb-2">My Certificates</h1>
            <p className="text-muted-foreground">View and download certificates for completed courses.</p>
          </div>
        </div>

        {isLoading ? (
          <LoadingState count={3} />
        ) : certificates && certificates.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <Card key={cert.id} className="overflow-hidden flex flex-col hover-elevate">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-center border-b-[8px] border-primary relative flex-1 flex flex-col justify-center min-h-[250px]">
                  {/* Decorative background elements for cert visual */}
                  <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iIzAwMCIgc3Ryb2tlLW9wYWNpdHk9IjAuMSI+PC9wYXRoPgo8L3N2Zz4=')]"></div>
                  
                  <Award className="w-12 h-12 text-primary mx-auto mb-4 relative z-10" />
                  <h3 className="text-white font-serif font-bold text-xl leading-tight mb-2 relative z-10">
                    Certificate of Completion
                  </h3>
                  <p className="text-slate-300 text-sm relative z-10 font-medium px-4">
                    {cert.courseTitle}
                  </p>
                  
                  <div className="mt-6 pt-4 border-t border-slate-700/50 flex justify-between text-[10px] text-slate-400 relative z-10 text-left">
                    <div>
                      <span className="block opacity-70 uppercase tracking-wider mb-1">Date</span>
                      <span className="text-slate-300 font-mono">{new Date(cert.issuedAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right">
                      <span className="block opacity-70 uppercase tracking-wider mb-1">ID</span>
                      <span className="text-slate-300 font-mono">{cert.credentialId}</span>
                    </div>
                  </div>
                </div>
                
                <CardContent className="p-4 flex gap-2">
                  <Button variant="outline" className="flex-1" size="sm">
                    <Download className="w-4 h-4 mr-2" /> Download PDF
                  </Button>
                  <Button variant="secondary" className="px-3" size="sm" title="Share Certificate">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState 
            icon={Award}
            title="No certificates yet"
            description="Complete a course 100% to earn your first certificate."
            actionLabel="Browse Courses"
            actionHref="/courses"
          />
        )}
      </div>
    </AppLayout>
  );
}
