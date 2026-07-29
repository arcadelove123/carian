import {redirect} from "next/navigation";

export default async function ProjectRedicrecting({params} : {params: Promise<{projectId: string}>;}) {

  const {projectId} = await params;

  redirect(`/projects/${projectId}/overview`);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 p-24">
    
    </main>
  );
}
