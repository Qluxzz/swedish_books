module Route.Sidor exposing (Model, Msg, RouteParams, route, Data, ActionData)

{-|

@docs Model, Msg, RouteParams, route, Data, ActionData

-}

import BackendTask
import BackendTask.Custom
import FatalError
import Head
import Html
import Html.Attributes
import Json.Decode
import Json.Encode
import PagesMsg
import Route
import RouteBuilder
import Shared
import View


type alias Model =
    {}


type alias Msg =
    ()


type alias RouteParams =
    {}


route : RouteBuilder.StatelessRoute RouteParams Data ActionData
route =
    RouteBuilder.single
        { data = data, head = head }
        |> RouteBuilder.buildNoState
            { view = view }


type alias Data =
    List { min : Int, max : Int, count : Int }


type alias ActionData =
    BackendTask.BackendTask FatalError.FatalError (List RouteParams)


data : BackendTask.BackendTask FatalError.FatalError Data
data =
    BackendTask.Custom.run "getPageRanges"
        Json.Encode.null
        (Json.Decode.list
            (Json.Decode.map3 (\min max count -> { min = min, max = max, count = count })
                (Json.Decode.index 0 Json.Decode.int)
                (Json.Decode.index 1 Json.Decode.int)
                (Json.Decode.index 2 Json.Decode.int)
            )
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
            "Böcker per sidantal"
    in
    { title = title
    , body =
        [ Html.h2 [] [ Html.text title ]
        , Html.section [ Html.Attributes.class "book-grid" ]
            (List.map
                (\{ min, max, count } ->
                    let
                        range =
                            String.fromInt min ++ "-" ++ String.fromInt max
                    in
                    Html.a [ Html.Attributes.href (Route.toString <| Route.Sidor__Range___Page_ { range = range, page = "1" }) ]
                        [ Html.div [ Html.Attributes.class "page-group" ]
                            [ Html.text <|
                                range
                                    ++ " sidor"
                            , Html.br [] []
                            , Html.span []
                                [ Html.text <|
                                    "("
                                        ++ String.fromInt count
                                        ++ " "
                                        ++ (if count == 1 then
                                                "bok"

                                            else
                                                "böcker"
                                           )
                                        ++ ")"
                                ]
                            ]
                        ]
                )
                app.data
            )
        ]
    }
