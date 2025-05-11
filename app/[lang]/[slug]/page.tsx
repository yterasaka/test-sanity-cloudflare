import {CustomPortableText} from '@/components/CustomPortableText'
import {Header} from '@/components/Header'
import {Navbar} from '@/components/Navbar'
import {i18n} from '@/sanity/lib/i18n'
import {sanityFetch} from '@/sanity/lib/live'
import {pagesBySlugQuery, settingsQuery, slugsByTypeQuery} from '@/sanity/lib/queries'
import type {Metadata, ResolvingMetadata} from 'next'
import {toPlainText, type PortableTextBlock} from 'next-sanity'
import {draftMode} from 'next/headers'
import {notFound} from 'next/navigation'

type Props = {
  params: Promise<{lang: string; slug: string}>
}

export async function generateMetadata(
  {params}: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const {lang, slug} = await params
  const {data: page} = await sanityFetch({
    query: pagesBySlugQuery,
    params: {slug, language: lang},
    stega: false,
  })

  return {
    title: page?.title,
    description: page?.overview ? toPlainText(page.overview) : (await parent).description,
  }
}

export async function generateStaticParams() {
  const params: Array<{lang: string; slug: string}> = []

  for (const language of i18n.supportedLanguages) {
    const {data} = await sanityFetch({
      query: slugsByTypeQuery,
      params: {type: 'page', language: language.id},
      stega: false,
      perspective: 'published',
    })

    for (const item of data) {
      if (item.slug) {
        params.push({
          lang: language.id,
          slug: item.slug,
        })
      }
    }
  }

  console.log('Generated static params for pages:', params)
  return params
}

export default async function PageSlugRoute({params}: Props) {
  const {lang, slug} = await params

  console.log('Page accessed with params:', {lang, slug})

  const [{data}, {data: settings}] = await Promise.all([
    sanityFetch({
      query: pagesBySlugQuery,
      params: {slug, language: lang},
    }),
    sanityFetch({query: settingsQuery}),
  ])

  console.log('Fetched page data:', data)

  // Only show the 404 page if we're in production, when in draft mode we might be about to create a page on this slug, and live reload won't work on the 404 route
  if (!data?._id && !(await draftMode()).isEnabled) {
    console.log('Page not found, showing 404')
    notFound()
  }

  const {body, overview, title} = data ?? {}

  return (
    <div>
      <Navbar data={settings} lang={lang} translations={data?._translations} />
      <div className="mb-14">
        {/* Header */}
        <Header
          id={data?._id || null}
          type={data?._type || null}
          path={['overview']}
          title={title || (data?._id ? 'Untitled' : '404 Page Not Found')}
          description={overview}
        />

        {/* Body */}
        {body && (
          <CustomPortableText
            id={data?._id || null}
            type={data?._type || null}
            path={['body']}
            paragraphClasses="font-serif max-w-3xl text-gray-600 text-xl"
            value={body as unknown as PortableTextBlock[]}
          />
        )}
      </div>
      <div className="absolute left-0 w-screen border-t" />
    </div>
  )
}
