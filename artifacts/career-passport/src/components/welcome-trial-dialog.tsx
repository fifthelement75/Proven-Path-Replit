import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { Link } from "wouter";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trialEndsAt?: string | null;
}

export function WelcomeTrialDialog({ open, onOpenChange, trialEndsAt }: Props) {
  const endDateText = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : "in 7 days";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">Welcome to Proven Path!</DialogTitle>
          <DialogDescription className="text-center text-base">
            Your account is ready. You have <strong>7 days of full access</strong> to every feature on the platform — no
            credit card required.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
          <p className="mb-1">
            Your free trial ends on <strong className="text-foreground">{endDateText}</strong>.
          </p>
          <p>
            We'll email you a reminder one day before it ends. You can subscribe any time from the Billing page to keep
            full access after your trial.
          </p>
        </div>
        <DialogFooter className="sm:flex-col sm:gap-2">
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            Start exploring
          </Button>
          <Link href="/billing" className="w-full">
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              View billing
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
