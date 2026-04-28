import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, Upload } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.codeReview.uploadAndReview.useMutation();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const content = await file.text();
      const result = await uploadMutation.mutateAsync({
        fileName: file.name,
        fileContent: content,
      });

      setLocation(`/review/${result.reviewId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* Header */}
      <header className="border-b-4 border-black">
        <div className="container py-8 flex justify-between items-start">
          <div>
            <h1 className="text-6xl font-black leading-tight">CODE REVIEW CHATBOT</h1>
            <p className="text-xl font-bold mt-2 tracking-tight">AI-POWERED ANALYSIS</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-16 flex flex-col justify-center">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="mb-16">
            <div className="border-l-8 border-black pl-8 mb-12">
              <h2 className="text-5xl font-black mb-4">UPLOAD YOUR CODE</h2>
              <p className="text-2xl font-bold leading-tight">
                Get instant AI-powered analysis. Identify bugs, discover improvements, understand your code.
              </p>
            </div>
          </div>

          {/* Upload Area */}
          <div className="mb-16">
            <div
              className="border-4 border-black p-12 cursor-pointer hover:bg-black hover:text-white transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                accept=".py,.js,.ts,.tsx,.jsx,.java,.cpp,.c,.cs,.rb,.go,.rs,.php,.swift,.kt,.scala,.sh,.sql,.html,.css,.json,.xml,.yaml,.yml,.txt"
                disabled={isUploading}
              />

              <div className="text-center">
                <Upload className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-3xl font-black mb-2">CLICK TO UPLOAD</h3>
                <p className="text-lg font-bold mb-4">or drag and drop your code file</p>
                <p className="text-sm font-bold opacity-75">
                  Python • JavaScript • TypeScript • Java • C++ • Go • Rust • and more
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 border-4 border-red-600 bg-red-50 p-4">
                <p className="font-bold text-red-900">{error}</p>
              </div>
            )}

            {isUploading && (
              <div className="mt-4 flex items-center justify-center gap-3 font-bold text-lg">
                <Loader2 className="w-5 h-5 animate-spin" />
                ANALYZING YOUR CODE...
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
