"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shared/ui/card";
import { Button } from "@/components/shared/ui/button";
import { Textarea } from "@/components/shared/ui/textarea";
import { useI18n } from "@/lib/i18n/context";
import { useToast } from "@/components/shared/ui/toast";
import { getTenantId } from "@/lib/api/client";
import { Send, Loader2, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Citation {
  document_id: string;
  document_name?: string;
  chunk_id?: string;
  content?: string;
  excerpt?: string;
  page_number?: number;
  similarity?: number;
}

interface ChatMessage {
  question: string;
  answer: string;
  citations: Citation[];
  timestamp: Date;
}

export function DocumentChat() {
  const { locale, dir } = useI18n();
  const { toast } = useToast();
  const tenantId = getTenantId();
  const isAr = locale === "ar";
  
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const queryMutation = useMutation({
    mutationFn: async (q: string) => {
      const response = await fetch(`/api/v1/tenants/${tenantId}/rag/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Query failed" }));
        throw new Error(error.error || "Query failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      const newMessage: ChatMessage = {
        question,
        answer: data.answer || "No answer available",
        citations: data.citations || [],
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, newMessage]);
      setQuestion("");
    },
    onError: (error: any) => {
      toast({
        title: isAr ? "فشل الاستعلام" : "Query failed",
        description: error.message || (isAr ? "حاول مرة أخرى" : "Please try again"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    queryMutation.mutate(question.trim());
  };

  return (
    <Card dir={dir}>
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-lg font-semibold">
          {isAr ? "اسأل عن المستندات" : "Ask About Documents"}
        </CardTitle>
        <CardDescription>
          {isAr 
            ? "اطرح أسئلة حول المستندات المرفوعة"
            : "Ask questions about your uploaded documents"}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
        {/* Chat Messages */}
        {messages.length > 0 && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div key={idx} className="space-y-2">
                {/* Question */}
                <div className={cn(
                  "flex gap-2",
                  isAr ? "flex-row-reverse" : "flex-row"
                )}>
                  <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                    <p className="text-sm">{msg.question}</p>
                  </div>
                </div>

                {/* Answer */}
                <div className={cn(
                  "flex gap-2",
                  isAr ? "flex-row-reverse" : "flex-row"
                )}>
                  <div className="bg-muted rounded-lg px-4 py-3 max-w-[80%] space-y-2">
                    <p className="text-sm whitespace-pre-wrap">{msg.answer}</p>
                    
                    {/* Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="pt-2 border-t border-border/50">
                        <p className="text-xs text-muted-foreground mb-1">
                          {isAr ? "المصادر:" : "Sources:"}
                        </p>
                        <div className="space-y-1">
                          {msg.citations.slice(0, 3).map((citation, cidx) => (
                            <div
                              key={cidx}
                              className="flex items-start gap-2 text-xs text-muted-foreground"
                            >
                              <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                              <p className="line-clamp-2">{citation.content?.substring(0, 100) || citation.excerpt?.substring(0, 100) || 'No preview available'}...</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {messages.length === 0 && (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground">
              {isAr 
                ? "ابدأ بطرح سؤال عن مستنداتك"
                : "Start by asking a question about your documents"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isAr 
                ? "مثال: ما هي شروط الدفع في العقد؟"
                : "Example: What are the payment terms in the contract?"}
            </p>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={isAr 
              ? "اكتب سؤالك هنا..."
              : "Type your question here..."}
            className="min-h-[80px] resize-none"
            disabled={queryMutation.isPending}
            dir={dir}
          />
          
          <div className={cn(
            "flex items-center gap-2",
            isAr ? "flex-row-reverse" : "flex-row"
          )}>
            <Button
              type="submit"
              disabled={!question.trim() || queryMutation.isPending}
              className="gap-2"
            >
              {queryMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isAr ? "جاري البحث..." : "Searching..."}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {isAr ? "إرسال" : "Send"}
                </>
              )}
            </Button>
            
            {messages.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setMessages([])}
                disabled={queryMutation.isPending}
              >
                {isAr ? "مسح المحادثة" : "Clear Chat"}
              </Button>
            )}
          </div>
        </form>

        {/* Info Message */}
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            {isAr 
              ? "الإجابات مبنية على المستندات المرفوعة فقط. تأكد من رفع المستندات ذات الصلة أولاً."
              : "Answers are based only on uploaded documents. Make sure to upload relevant documents first."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
