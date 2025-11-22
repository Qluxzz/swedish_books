module Route.Bok.Slug_ exposing (Model, Msg, RouteParams, route, Data, ActionData)

{-|

@docs Model, Msg, RouteParams, route, Data, ActionData

-}

import BackendTask
import BackendTask.Custom
import Book
import Date
import DateOrDateTime
import FatalError
import Head
import Head.Seo as Seo
import Html
import Html.Attributes
import Json.Decode
import Json.Encode
import LanguageTag.Language
import LanguageTag.Region
import Pages.Url
import PagesMsg
import RouteBuilder
import Shared
import Time exposing (Month(..))
import View


type alias Model =
    {}


type alias Msg =
    ()


type alias RouteParams =
    { slug : String }


route : RouteBuilder.StatelessRoute RouteParams Data ActionData
route =
    RouteBuilder.preRender
        { data = data, pages = pages, head = head }
        |> RouteBuilder.buildNoState
            { view = view }


type alias Data =
    Book.Book


type alias ActionData =
    BackendTask.BackendTask FatalError.FatalError (List RouteParams)


data : RouteParams -> BackendTask.BackendTask FatalError.FatalError Data
data routeParams =
    BackendTask.Custom.run "getBookBySlug"
        (Json.Encode.string routeParams.slug)
        Book.decode
        |> BackendTask.allowFatal


head : RouteBuilder.App Data ActionData RouteParams -> List Head.Tag
head app =
    Seo.book
        (Seo.summary
            { canonicalUrlOverride = Nothing
            , siteName = "https://boklåda.se/"
            , image =
                { url = Maybe.map Pages.Url.external app.data.imageUrl |> Maybe.withDefault (Pages.Url.external "")
                , alt = "Omslag för " ++ app.data.title
                , dimensions = Nothing
                , mimeType = Nothing
                }
            , description = title app.data
            , locale = Just ( LanguageTag.Language.sv, LanguageTag.Region.se )
            , title = title app.data
            }
        )
        { tags = []
        , isbn = app.data.isbn
        , releaseDate = Just <| DateOrDateTime.Date (Date.fromCalendarDate app.data.year Jan 1)
        }


view :
    RouteBuilder.App Data ActionData RouteParams
    -> Shared.Model
    -> View.View (PagesMsg.PagesMsg Msg)
view app _ =
    { title = title app.data
    , body =
        [ Html.div [ Html.Attributes.class "book-details" ]
            [ Book.view { linkToAuthor = True, linkToYear = True, linkToTitle = False } app.data
            , links app.data
            ]
        ]
    }


title : Book.Book -> String
title book =
    book.title ++ " (" ++ String.fromInt book.year ++ ") av " ++ ([ Just book.author.name, Maybe.map (\s -> "(" ++ s ++ ")") book.author.lifeSpan ] |> List.filterMap identity |> String.join " ")


pages : BackendTask.BackendTask FatalError.FatalError (List RouteParams)
pages =
    BackendTask.Custom.run "getAllBookUrls"
        Json.Encode.null
        (Json.Decode.list (Json.Decode.map (\slug -> { slug = slug }) Json.Decode.string))
        |> BackendTask.allowFatal



-- HELPERS


goodreadsUrl : Book.Goodreads -> String
goodreadsUrl { bookUrl } =
    "https://www.goodreads.com" ++ bookUrl


librisUrl : Book.Book -> String
librisUrl book =
    "https://libris.kb.se/formatQuery.jsp?SEARCH_ALL=" ++ book.title ++ " " ++ book.author.name ++ "&d=libris&f=simp&spell=true"


adlibrisUrl : Book.Book -> String
adlibrisUrl book =
    "https://www.adlibris.com/se/sok?q=" ++ book.title ++ " " ++ book.author.name


bokusUrl : Book.Book -> String
bokusUrl book =
    "https://www.bokus.com/cgi-bin/product_search.cgi?ac_used=no&search_word=" ++ book.title ++ " " ++ book.author.name


bokBorsenUrl : Book.Book -> String
bokBorsenUrl book =
    "https://www.bokborsen.se/?q=" ++ book.title ++ " " ++ book.author.name


storygraphUrl : Book.Book -> String
storygraphUrl book =
    "https://app.thestorygraph.com/browse?search_term=" ++ book.title ++ " " ++ book.author.name


akademiBokhandelnUrl : Book.Book -> String
akademiBokhandelnUrl book =
    "https://www.akademibokhandeln.se/search?q=" ++ book.title ++ " " ++ book.author.name


links : Book.Book -> Html.Html msg
links book =
    let
        urls =
            [ Just ( "Libris", librisUrl book )
            , Just ( "StoryGraph", storygraphUrl book )
            , Maybe.map (goodreadsUrl >> Tuple.pair "Goodreads") book.goodreads
            , Just ( "Bokbörsen", bokBorsenUrl book )
            , Just ( "Adlibris", adlibrisUrl book )
            , Just ( "Akademibokhandeln", akademiBokhandelnUrl book )
            , Just ( "Bokus", bokusUrl book )
            ]
                |> List.filterMap identity
    in
    Html.div [ Html.Attributes.class "links" ]
        [ Html.h3 [] [ Html.text "Hitta boken:" ]
        , Html.ul []
            (List.map (\( t, url ) -> Html.li [] [ Shared.externalLink [ Html.Attributes.href url ] [ Html.text t ] ]) urls)
        ]
