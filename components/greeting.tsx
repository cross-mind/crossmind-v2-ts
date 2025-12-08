import { motion } from "framer-motion";
import { Code2, FileText, Lightbulb, Sparkles } from "lucide-react";

export const Greeting = () => {
  return (
    <div
      className="mx-auto mt-8 flex size-full max-w-3xl flex-col px-4 md:mt-20 md:px-8"
      key="overview"
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-2xl tracking-tight md:text-3xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        Welcome to CrossMind AI
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 text-base text-muted-foreground md:text-lg"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        Your intelligent product development assistant
      </motion.div>

      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-12 grid gap-3 md:grid-cols-2"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <div className="group flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50">
          <div className="mt-0.5 rounded-md bg-primary/10 p-2">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Brainstorm Ideas</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Generate and refine product concepts with AI assistance
            </div>
          </div>
        </div>

        <div className="group flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50">
          <div className="mt-0.5 rounded-md bg-primary/10 p-2">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Document Generation</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Create PRDs, specs, and design docs automatically
            </div>
          </div>
        </div>

        <div className="group flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50">
          <div className="mt-0.5 rounded-md bg-primary/10 p-2">
            <Code2 className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Technical Planning</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Break down features into actionable development tasks
            </div>
          </div>
        </div>

        <div className="group flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50">
          <div className="mt-0.5 rounded-md bg-primary/10 p-2">
            <Lightbulb className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">Context Awareness</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Leverage project memory for informed decision-making
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
