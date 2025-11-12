module Route.Betygsatt.Sida_ exposing (Model, Msg, RouteParams, route, Data, ActionData)

{-|

@docs Model, Msg, RouteParams, route, Data, ActionData

-}

import BackendTask
import BackendTask.Custom
import Book
import FatalError
import Head
import Html
import Html.Attributes
import Json.Decode
import Json.Encode
import PageSelector
import PagesMsg
import PaginationResult
import Route
import RouteBuilder
import Shared
import View


type alias Model =
    {}


type alias Msg =
    ()


type alias RouteParams =
    { sida : String }


route : RouteBuilder.StatelessRoute RouteParams Data ActionData
route =
    RouteBuilder.preRender
        { data = data, pages = pages, head = head }
        |> RouteBuilder.buildNoState
            { view = view }


type alias Data =
    PaginationResult.Model Book.Book


type alias ActionData =
    BackendTask.BackendTask FatalError.FatalError (List RouteParams)


data : RouteParams -> BackendTask.BackendTask FatalError.FatalError Data
data routeParams =
    BackendTask.Custom.run "getRatedTitles"
        (Json.Encode.int (String.toInt routeParams.sida |> Maybe.withDefault 0))
        (PaginationResult.decode Book.decode)
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
        currentPage =
            String.toInt app.routeParams.sida
                |> Maybe.withDefault 0

        title =
            "Visar alla betygsatta böcker (Sida " ++ app.routeParams.sida ++ " av " ++ String.fromInt app.data.pages ++ ")"
    in
    { title = title
    , body =
        [ Html.h2 [] [ Html.text title ]
        , Html.section []
            [ Html.div
                [ Html.Attributes.class "book-grid" ]
                (List.map Book.defaultView app.data.data)
            ]
        , PageSelector.view currentPage app.data.pages (\page -> Route.Betygsatt__Sida_ { sida = page })
        ]
    }


pages : BackendTask.BackendTask FatalError.FatalError (List RouteParams)
pages =
    BackendTask.Custom.run "getRatedTitlesPageCount"
        Json.Encode.null
        Json.Decode.int
        |> BackendTask.map (\p -> List.range 1 p |> List.map (\page -> { sida = String.fromInt page }))
        |> BackendTask.allowFatal
