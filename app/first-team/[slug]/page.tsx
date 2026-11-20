import { redirect } from "next/navigation";

export default async function FirstTeamProfileRedirect({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/team/${encodeURIComponent(slug)}`);
}
