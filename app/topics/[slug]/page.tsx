import { notFound } from 'next/navigation';
import ArticleView from '../../ArticleView';
import { articleBy } from '@/lib/articles';
import { metadataFor, paramsFor } from '@/lib/articles/page';

export const dynamicParams = false;
export const generateStaticParams = paramsFor('topics');

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  return metadataFor('topics', (await params).slug);
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const a = articleBy('topics', (await params).slug);
  if (!a) notFound();
  return <ArticleView a={a} />;
}
