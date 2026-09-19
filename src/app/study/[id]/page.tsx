import { StudyView } from "@/components/study/StudyView";
import { hasApiKey } from "@/lib/claude";

export const metadata = { title: "学習 — Script Flow" };

export default async function StudyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudyView id={id} aiEnabled={hasApiKey()} />;
}
