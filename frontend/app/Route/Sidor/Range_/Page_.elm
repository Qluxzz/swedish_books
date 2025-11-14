module Route.Sidor.Range_.Page_ exposing (Model, Msg, RouteParams, route, Data, ActionData)

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
    { range : String, page : String }


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
    BackendTask.Custom.run "getBooksForPageRange"
        (Json.Encode.object [ ( "range", Json.Encode.string routeParams.range ), ( "page", Json.Encode.string routeParams.page ) ])
        (PaginationResult.decode Book.decode)
        |> BackendTask.allowFatal


head : RouteBuilder.App Data ActionData RouteParams -> List Head.Tag
head _ =
    []


view :
    RouteBuilder.App Data ActionData RouteParams
    -> Shared.Model
    -> View.View (PagesMsg.PagesMsg Msg)
view app _ =
    let
        title =
            "Böcker på " ++ app.routeParams.range ++ " sidor (Sida " ++ app.routeParams.page ++ " av " ++ String.fromInt app.data.pages ++ ")"

        currentPage =
            String.toInt app.routeParams.page |> Maybe.withDefault 0
    in
    { title = title
    , body =
        [ Html.h2 []
            [ Html.text "Böcker på ", Html.a [ Html.Attributes.href (Route.toString Route.Sidor) ] [ Html.text <| app.routeParams.range ++ " sidor" ], Html.text <| " (Sida " ++ app.routeParams.page ++ " av " ++ String.fromInt app.data.pages ++ ")" ]
        , Html.section []
            [ Html.div
                [ Html.Attributes.class "book-grid" ]
                (List.map Book.defaultView app.data.data)
            ]
        , PageSelector.view currentPage app.data.pages (\page -> Route.Sidor__Range___Page_ { range = app.routeParams.range, page = page })
        ]
    }


pages : BackendTask.BackendTask FatalError.FatalError (List RouteParams)
pages =
    BackendTask.Custom.run "getPageRanges"
        Json.Encode.null
        (Json.Decode.list
            (Json.Decode.map4 (\min max _ p -> List.range 1 p |> List.map (\page -> { range = String.fromInt min ++ "-" ++ String.fromInt max, page = String.fromInt page }))
                (Json.Decode.index 0 Json.Decode.int)
                (Json.Decode.index 1 Json.Decode.int)
                (Json.Decode.index 2 Json.Decode.int)
                (Json.Decode.index 3 Json.Decode.int)
            )
            |> Json.Decode.map List.concat
        )
        |> BackendTask.allowFatal
