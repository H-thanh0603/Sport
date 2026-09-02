import { CommentsModeration, ReportsModeration } from "@/components/admin/moderation";

export default function AdminModerationPage() {
  return (
    <div className="space-y-6">
      <CommentsModeration />
      <ReportsModeration />
    </div>
  );
}
