module Route.Forfattare exposing (Model, Msg, RouteParams, route, Data, ActionData)

{-|

@docs Model, Msg, RouteParams, route, Data, ActionData

-}

import BackendTask
import BackendTask.Custom
import Dict
import Dict.Extra
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
    { data : List ( String, Int ) }


type alias ActionData =
    BackendTask.BackendTask FatalError.FatalError (List RouteParams)


data : BackendTask.BackendTask FatalError.FatalError Data
data =
    BackendTask.Custom.run "getCountOfAuthorsByStartingFamilyNameLetter"
        Json.Encode.null
        (Json.Decode.map Data
            (Json.Decode.list
                (Json.Decode.map2
                    Tuple.pair
                    (Json.Decode.field "prefix" Json.Decode.string)
                    (Json.Decode.field "amount" Json.Decode.int)
                )
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
    { title = "Författare"
    , body =
        [ Html.div [ Html.Attributes.class "prefixes" ]
            [ Html.ul []
                (app.data.data
                    |> Dict.Extra.groupBy (Tuple.first >> String.left 1)
                    |> Dict.toList
                    |> List.map
                        (\( prefix, items ) ->
                            case items of
                                [ i ] ->
                                    authorLink i

                                _ ->
                                    Html.details []
                                        [ Html.summary [] [ Html.text prefix ]
                                        , Html.ul []
                                            (items
                                                |> List.map authorLink
                                            )
                                        ]
                        )
                )
            ]
        ]
    }


authorLink : ( String, Int ) -> Html.Html msg
authorLink ( bokstav, count ) =
    Html.li []
        [ Html.a
            [ Html.Attributes.href (Route.toString (Route.Forfattare__Bokstav_ { bokstav = bokstav })) ]
            [ Html.text <| bokstav ++ " (" ++ String.fromInt count ++ " författare)"
            ]
        ]
