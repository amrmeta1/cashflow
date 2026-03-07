"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/context";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatResponse {
  answer?: string;
  response?: string;
}

export function TreasuryChat() {
  const { locale, dir } = useI18n();
  const isAr = locale === "ar";
  
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  
  const answerRef = useRef<HTMLDivElement>(null);

  const chatMutation = useMutation<ChatResponse, Error, string>({
    mutationFn: async (question: string) => {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get answer');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setAnswer(data.answer || data.response || null);
      // Auto-scroll to answer
      setTimeout(() => {
        answerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    },
    retry: 1,
    retryDelay: 1000,
  });

  const handleSend = () => {
    if (!question.trim() || chatMutation.isPending) return;
    chatMutation.mutate(question.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="shadow-sm" dir={dir}>
      <CardHeader className="pb-3 pt-5 px-5">
        <CardTitle className="text-lg font-semibold">
          {isAr ? "الذكاء الاصطناعي للخزينة" : "AI Treasury Intelligence"}
        </CardTitle>
        <CardDescription>
          {isAr 
            ? "اطرح سؤالاً عن التدفق النقدي أو المخاطر الحالية"
            : "Ask a question about cash flow or current risks"}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
        <div className="space-y-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAr 
              ? "مثال: لماذا ارتفع معدل الحرق هذا الشهر؟"
              : "Example: Why did burn rate increase this month?"}
            disabled={chatMutation.isPending}
            dir={dir}
            className={cn(
              "resize-none min-h-[100px]",
              isAr && "text-right"
            )}
          />
          
          {chatMutation.isError && (
            <p className="text-sm text-rose-600">
              {isAr 
                ? "حدث خطأ. حاول مرة أخرى."
                : "An error occurred. Please try again."}
            </p>
          )}
        </div>

        <Button 
          onClick={handleSend}
          disabled={!question.trim() || chatMutation.isPending}
          className="w-full sm:w-auto"
        >
          {chatMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="ms-2">{isAr ? "جاري الإرسال..." : "Sending..."}</span>
            </>
          ) : (
            isAr ? "إرسال" : "Send"
          )}
        </Button>

        {answer && (
          <div ref={answerRef} className="space-y-2 pt-2">
            <Badge variant="secondary" className="text-xs">
              {isAr ? "رؤية ذكية" : "AI Insight"}
            </Badge>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm whitespace-pre-wrap" dir={dir}>
                {answer}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
