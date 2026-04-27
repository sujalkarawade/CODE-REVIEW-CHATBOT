import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { Loader2, Download, MessageCircle, Home, AlertTriangle, Lightbulb, BookOpen } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Streamdown } from "streamdown";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-light.css";

interface BugItem {
  severity: "critical" | "high" | "medium" | "low";
  line?: number;
  issue: string;
  fix: string;
}

interface SuggestionItem {
  category: string;
  suggestion: string;
  benefit: string;
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export default function Review() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { reviewId } = useParams();
  const reviewIdNum = parseInt(reviewId || "0", 10);

  const [chatInput, setChatInput] = useState("");
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const reviewQuery = trpc.codeReview.getReview.useQuery({ reviewId: reviewIdNum });
  const chatHistoryQuery = trpc.codeReview.getChatHistory.useQuery({ reviewId: reviewIdNum });
  const downloadQuery = trpc.codeReview.downloadFile.useQuery({ reviewId: reviewIdNum });
  const chatMutation = trpc.codeReview.chat.useMutation();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  // Update local messages from query
  useEffect(() => {
    if (chatHistoryQuery.data) {
      setLocalMessages(
        chatHistoryQuery.data.map((msg) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }))
      );
    }
  }, [chatHistoryQuery.data]);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatInput("");
    setIsSendingChat(true);

    // Optimistic update
    setLocalMessages((prev) => [
      ...prev,
      {
        id: Date.now(),
        role: "user",
        content: userMessage,
        createdAt: new Date(),
      },
    ]);

    try {
      const response = await chatMutation.mutateAsync({
        reviewId: reviewIdNum,
        message: userMessage,
      });

      setLocalMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: response.message,
          createdAt: new Date(),
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      // Remove optimistic user message on error
      setLocalMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsSendingChat(false);
    }
  };

  if (!isAuthenticated) return null;

  if (reviewQuery.isLoading) {
    return (
      <div className="min-h-screen bg-white text-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="text-2xl font-black">LOADING REVIEW</p>
        </div>
      </div>
    );
  }

  if (!reviewQuery.data) {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col">
        <header className="border-b-4 border-black">
          <div className="container py-8">
            <Button
              variant="outline"
              className="border-2 border-black font-bold"
              onClick={() => setLocation("/")}
            >
              <Home className="w-4 h-4 mr-2" /> HOME
            </Button>
          </div>
        </header>
        <main className="flex-1 container py-16 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-black mb-4">REVIEW NOT FOUND</h1>
            <Button
              className="bg-black text-white border-2 border-black font-bold"
              onClick={() => setLocation("/")}
            >
              GO HOME
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const review = reviewQuery.data;
  const bugs = Array.isArray(review.bugs) ? review.bugs : [];
  const suggestions = Array.isArray(review.suggestions) ? review.suggestions : [];
  const language = (review.language || "plaintext") as string;

  const severityColors: Record<string, string> = {
    critical: "bg-red-100 border-red-600",
    high: "bg-orange-100 border-orange-600",
    medium: "bg-yellow-100 border-yellow-600",
    low: "bg-blue-100 border-blue-600",
  };

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* Header */}
      <header className="border-b-4 border-black sticky top-0 bg-white z-10">
        <div className="container py-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-black">{review.fileName}</h1>
            <p className="font-bold text-sm mt-1 uppercase">{review.language}</p>
          </div>
          <div className="flex gap-3">
            {downloadQuery.data && downloadQuery.data.downloadUrl && (
              <Button
                className="bg-black text-white border-2 border-black font-bold"
                onClick={() => window.open(downloadQuery.data!.downloadUrl, "_blank")}
              >
                <Download className="w-4 h-4 mr-2" /> DOWNLOAD
              </Button>
            )}
            <Button
              variant="outline"
              className="border-2 border-black font-bold"
              onClick={() => setLocation("/")}
            >
              <Home className="w-4 h-4 mr-2" /> HOME
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Code & Analysis */}
          <div className="lg:col-span-2 space-y-8">
            {/* Code Display */}
            <section className="border-4 border-black">
              <div className="bg-black text-white px-6 py-3 font-black text-lg">CODE</div>
              <pre className="p-6 bg-gray-50 overflow-x-auto text-sm font-mono hljs">
                <code
                  className={`language-${language}`}
                  dangerouslySetInnerHTML={{
                    __html: hljs.highlightAuto(review.fileContent || "").value,
                  }}
                />
              </pre>
            </section>

            {/* Bugs Section */}
            <section className="border-4 border-black">
              <div className="bg-black text-white px-6 py-3 font-black text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> BUGS
              </div>
              <div className="p-6 space-y-4">
                {bugs.length === 0 ? (
                  <p className="font-bold text-green-700">✓ No bugs detected!</p>
                ) : (
                  bugs.map((bug: BugItem, idx: number) => (
                    <div key={idx} className={`border-4 p-4 ${severityColors[bug.severity] || ""}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-black text-sm uppercase">{bug.severity}</span>
                        {bug.line && <span className="font-bold text-xs">Line {bug.line}</span>}
                      </div>
                      <p className="font-bold mb-2">{bug.issue}</p>
                      <p className="text-sm font-semibold">
                        <strong>Fix:</strong> {bug.fix}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Suggestions Section */}
            <section className="border-4 border-black">
              <div className="bg-black text-white px-6 py-3 font-black text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5" /> SUGGESTIONS
              </div>
              <div className="p-6 space-y-4">
                {suggestions.length === 0 ? (
                  <p className="font-bold">No suggestions at this time.</p>
                ) : (
                  suggestions.map((sugg: SuggestionItem, idx: number) => (
                    <div key={idx} className="border-4 border-blue-600 p-4 bg-blue-50">
                      <h4 className="font-black text-sm uppercase mb-2">{sugg.category}</h4>
                      <p className="font-bold mb-2">{sugg.suggestion}</p>
                      <p className="text-sm font-semibold">
                        <strong>Benefit:</strong> {sugg.benefit}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Explanation Section */}
            <section className="border-4 border-black">
              <div className="bg-black text-white px-6 py-3 font-black text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" /> EXPLANATION
              </div>
              <div className="p-6 prose prose-sm max-w-none">
                <Streamdown>{review.explanation}</Streamdown>
              </div>
            </section>
          </div>

          {/* Right Column: Chat */}
          <div className="lg:col-span-1">
            <div className="border-4 border-black h-full flex flex-col sticky top-24">
              <div className="bg-black text-white px-6 py-3 font-black text-lg flex items-center gap-2">
                <MessageCircle className="w-5 h-5" /> CHAT
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {localMessages.length === 0 && (
                  <p className="text-sm font-bold text-gray-600">Ask questions about this code...</p>
                )}
                {localMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-xs p-3 border-2 ${
                        msg.role === "user"
                          ? "bg-black text-white border-black"
                          : "bg-white text-black border-black"
                      }`}
                    >
                      <p className="text-sm font-bold">{msg.content}</p>
                    </div>
                  </div>
                ))}
                {isSendingChat && (
                  <div className="flex justify-start">
                    <div className="bg-white text-black border-2 border-black p-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="border-t-4 border-black p-4 space-y-3">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChat();
                    }
                  }}
                  placeholder="Ask about this code..."
                  className="w-full border-2 border-black p-3 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  disabled={isSendingChat}
                />
                <Button
                  className="w-full bg-black text-white border-2 border-black font-bold"
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || isSendingChat}
                >
                  SEND
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
