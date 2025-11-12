module Route.Bok.Id_.Slug_ exposing (Model, Msg, RouteParams, route, Data, ActionData)

{-|

@docs Model, Msg, RouteParams, route, Data, ActionData

-}

import BackendTask
import BackendTask.Custom
import Book exposing (Book)
import FatalError
import Head
import Html
import Html.Attributes
import Json.Decode
import Json.Encode
import PagesMsg
import RouteBuilder
import Shared
import View


type alias Model =
    {}


type alias Msg =
    ()


type alias RouteParams =
    { id : String, slug : String }


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
    BackendTask.Custom.run "getBookById"
        (Json.Encode.string routeParams.id)
        Book.decode
        |> BackendTask.allowFatal


head : RouteBuilder.App Data ActionData RouteParams -> List Head.Tag
head app =
    []


view :
    RouteBuilder.App Data ActionData RouteParams
    -> Shared.Model
    -> View.View (PagesMsg.PagesMsg Msg)
view app shared =
    { title = app.data.title ++ " (" ++ String.fromInt app.data.year ++ ") av " ++ ([ Just app.data.author.name, Maybe.map (\s -> "(" ++ s ++ ")") app.data.author.lifeSpan ] |> List.filterMap identity |> String.join " ")
    , body =
        [ Html.div [ Html.Attributes.class "book-details" ]
            [ Book.view { linkToAuthor = True, linkToYear = True, linkToTitle = False, showPageCount = True } app.data
            , links app.data
            ]
        ]
    }


pages : BackendTask.BackendTask FatalError.FatalError (List RouteParams)
pages =
    BackendTask.Custom.run "getAllBookUrls"
        Json.Encode.null
        (Json.Decode.list
            (Json.Decode.map2 (\id slug -> { id = String.fromInt id, slug = slug })
                (Json.Decode.index 0 Json.Decode.int)
                (Json.Decode.index 1 Json.Decode.string)
            )
        )
        |> BackendTask.allowFatal



-- HELPERS


goodreadsUrl : Book.Goodreads -> String
goodreadsUrl { bookUrl } =
    "https://www.goodreads.com" ++ bookUrl


librisUrl : Book.Book -> String
librisUrl { title, author } =
    "https://libris.kb.se/formatQuery.jsp?SEARCH_ALL=" ++ title ++ " " ++ author.name ++ "&d=libris&f=simp&spell=true"


adlibrisUrl : Book.Book -> String
adlibrisUrl { title, author } =
    "https://www.adlibris.com/se/sok?q=" ++ title ++ " " ++ author.name


bokusUrl : Book.Book -> String
bokusUrl { title, author } =
    "https://www.bokus.com/cgi-bin/product_search.cgi?ac_used=no&search_word=" ++ title ++ " " ++ author.name


bokBorsenUrl : Book.Book -> String
bokBorsenUrl { title, author } =
    "https://www.bokborsen.se/?q=" ++ title ++ " " ++ author.name


storygraphUrl : Book.Book -> String
storygraphUrl { title, author } =
    "https://app.thestorygraph.com/browse?search_term=" ++ title ++ " " ++ author.name


akademiBokhandelnUrl : Book.Book -> String
akademiBokhandelnUrl { title, author } =
    "https://www.akademibokhandeln.se/search?q=" ++ title ++ " " ++ author.name


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
            (List.map (\( title, url ) -> Html.li [] [ Shared.externalLink [ Html.Attributes.href url ] [ Html.text title ] ]) urls)
        ]
