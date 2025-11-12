module Route.Sidor.Range_ exposing (Model, Msg, RouteParams, route, Data, ActionData)

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
import PagesMsg
import RouteBuilder
import Shared
import View


type alias Model =
    {}


type alias Msg =
    ()


type alias RouteParams =
    { range : String }


route : RouteBuilder.StatelessRoute RouteParams Data ActionData
route =
    RouteBuilder.preRender
        { data = data, pages = pages, head = head }
        |> RouteBuilder.buildNoState
            { view = view }


type alias Data =
    List Book.Book


type alias ActionData =
    BackendTask.BackendTask FatalError.FatalError (List RouteParams)


data : RouteParams -> BackendTask.BackendTask FatalError.FatalError Data
data routeParams =
    BackendTask.Custom.run "getBooksForPageRange"
        (Json.Encode.string routeParams.range)
        (Json.Decode.list Book.decode)
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
            "Böcker på " ++ app.routeParams.range ++ " sidor "
    in
    { title = title
    , body =
        [ Html.h1 []
            [ Html.text title ]
        , Html.section
            []
            [ Html.div
                [ Html.Attributes.class "book-grid" ]
                (List.map Book.defaultView app.data)
            ]
        ]
    }


pages : BackendTask.BackendTask FatalError.FatalError (List RouteParams)
pages =
    BackendTask.Custom.run "getPageRanges"
        Json.Encode.null
        (Json.Decode.list
            (Json.Decode.map3 (\min max _ -> { range = String.fromInt min ++ "-" ++ String.fromInt max })
                (Json.Decode.index 0 Json.Decode.int)
                (Json.Decode.index 1 Json.Decode.int)
                (Json.Decode.index 2 Json.Decode.int)
            )
        )
        |> BackendTask.allowFatal
