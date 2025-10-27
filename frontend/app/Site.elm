module Site exposing (config)

import BackendTask exposing (BackendTask)
import FatalError exposing (FatalError)
import Head
import LanguageTag
import LanguageTag.Language
import SiteConfig exposing (SiteConfig)


config : SiteConfig
config =
    { canonicalUrl = "https://elm-pages.com"
    , head = head
    }


head : BackendTask FatalError (List Head.Tag)
head =
    [ Head.metaName "viewport" (Head.raw "width=device-width,initial-scale=1")
    , Head.sitemapLink "/sitemap.xml"
    , Head.rootLanguage (LanguageTag.Language.sv |> LanguageTag.build LanguageTag.emptySubtags)
    ]
        |> BackendTask.succeed
