module Route.Ar.Tal_ exposing (Model, Msg, RouteParams, route, Data, ActionData)

{-|

@docs Model, Msg, RouteParams, route, Data, ActionData

-}

import BackendTask
import BackendTask.Custom
import Book
import BookList
import FatalError
import Head
import Html
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
    { tal : String }


route : RouteBuilder.StatelessRoute RouteParams Data ActionData
route =
    RouteBuilder.preRender
        { data = data, pages = pages, head = head }
        |> RouteBuilder.buildNoState
            { view = view }


type alias Data =
    { ratedBooks : List Book.Book, unratedBooks : List Book.Book }


type alias ActionData =
    BackendTask.BackendTask FatalError.FatalError (List RouteParams)


data : RouteParams -> BackendTask.BackendTask FatalError.FatalError Data
data routeParams =
    BackendTask.Custom.run "getTitlesForYear"
        (Json.Encode.string routeParams.tal)
        (Json.Decode.map2 Data
            (Json.Decode.field "ratedTitles" (Json.Decode.list Book.decode))
            (Json.Decode.field "unratedTitles" (Json.Decode.list Book.decode))
        )
        |> BackendTask.allowFatal


head : RouteBuilder.App Data ActionData RouteParams -> List Head.Tag
head app =
    []


view :
    RouteBuilder.App Data ActionData RouteParams
    -> Shared.Model
    -> View.View (PagesMsg.PagesMsg Msg)
view app shared =
    let
        title =
            "Böcker för år " ++ app.routeParams.tal
    in
    { title = title
    , body =
        Html.h2 [] [ Html.text title ]
            :: BookList.view Book.defaultViewOptions app.data.ratedBooks app.data.unratedBooks
    }


pages : BackendTask.BackendTask FatalError.FatalError (List RouteParams)
pages =
    BackendTask.Custom.run "getAvailableYears"
        Json.Encode.null
        (Json.Decode.map2 (\min max -> List.range min max |> List.map (\year -> { tal = String.fromInt year }))
            (Json.Decode.field "min" Json.Decode.int)
            (Json.Decode.field "max" Json.Decode.int)
        )
        |> BackendTask.allowFatal
