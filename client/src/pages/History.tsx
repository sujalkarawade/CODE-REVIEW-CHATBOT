import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, Home, Trash2, Eye } from "lucide-react";
import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";

export default function History() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  const historyQuery = trpc.codeReview.getHistory.useQuery();

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* Header */}
      <header className="border-b-4 border-black">
        <div className="container py-8 flex justify-between items-center">
          <div>
            <h1 className="text-5xl font-black">REVIEW HISTORY</h1>
            <p className="font-bold mt-2">All your past code reviews</p>
          </div>
          <Button
            variant="outline"
            className="border-2 border-black font-bold"
            onClick={() => setLocation("/")}
          >
            <Home className="w-4 h-4 mr-2" /> HOME
          </Button>
        </div>
      </header>

      <main className="flex-1 container py-12">
        {historyQuery.isLoading ? (
          <div className="flex justify-center items-center py-16">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
              <p className="text-xl font-black">LOADING HISTORY</p>
            </div>
          </div>
        ) : historyQuery.data && historyQuery.data.length > 0 ? (
          <div className="space-y-4">
            {historyQuery.data.map((review) => (
              <div key={review.id} className="border-4 border-black p-6 hover:bg-black hover:text-white transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-black mb-2">{review.fileName}</h3>
                    <div className="flex gap-4 font-bold text-sm">
                      <span className="uppercase">{review.language}</span>
                      <span className="opacity-75">
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="bg-black text-white border-2 border-black font-bold hover:bg-white hover:text-black"
                      onClick={() => setLocation(`/review/${review.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" /> VIEW
                    </Button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t-2 border-current">
                  <div>
                    <p className="text-xs font-bold opacity-75">BUGS</p>
                    <p className="text-2xl font-black">{review.bugs?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold opacity-75">SUGGESTIONS</p>
                    <p className="text-2xl font-black">{review.suggestions?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold opacity-75">SEVERITY</p>
                    <p className="text-2xl font-black">
                      {review.bugs?.some((b: any) => b.severity === "critical") ? "HIGH" : "OK"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-4 border-black p-12 text-center">
            <h2 className="text-3xl font-black mb-4">NO REVIEWS YET</h2>
            <p className="font-bold mb-8">Upload your first code file to get started.</p>
            <Button
              className="bg-black text-white border-2 border-black font-bold text-lg px-8 py-3"
              onClick={() => setLocation("/")}
            >
              UPLOAD CODE
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
