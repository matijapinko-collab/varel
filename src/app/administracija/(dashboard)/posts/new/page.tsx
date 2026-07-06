import { createPost } from "@/server/actions/posts";

/** Creates a fresh draft post and redirects to the editor (WordPress-style). */
export default async function NewPostPage() {
  await createPost();
  return null;
}
