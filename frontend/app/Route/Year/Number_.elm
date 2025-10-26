module Route.Year.Number_ exposing (Model, Msg, RouteParams, route, Data, ActionData)

{-|

@docs Model, Msg, RouteParams, route, Data, ActionData

-}

import BackendTask
import BackendTask.Custom
import Book
import FatalError exposing (FatalError)
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
    { number : String }


route : RouteBuilder.StatelessRoute RouteParams Data ActionData
route =
    RouteBuilder.preRender
        { data = data
        , pages = pages
        , head = head
        }
        |> RouteBuilder.buildNoState { view = view }


type alias Data =
    { ratedBooks : List Book.Book, unratedBooks : List Book.Book }


type alias ActionData =
    BackendTask.BackendTask FatalError.FatalError (List RouteParams)


data : RouteParams -> BackendTask.BackendTask FatalError Data
data routeParams =
    BackendTask.Custom.run "getTitlesForYear"
        (Json.Encode.string routeParams.number)
        (Json.Decode.map2 (\rated unrated -> Data rated unrated)
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
    -> View.View (PagesMsg.PagesMsg ())
view app shared =
    { title = "Böcker för år " ++ app.routeParams.number
    , body =
        [ Html.header []
            [ Html.h1 [] [ Html.text <| "Böcker för år " ++ app.routeParams.number ]
            , Html.p [] [ Html.text "Svenska verk från bibliotekets magasin" ]
            ]
        , Html.main_ []
            [ Html.div [ Html.Attributes.class "container" ]
                [ if List.isEmpty app.data.ratedBooks then
                    Html.text ""

                  else
                    Html.section [ Html.Attributes.class "section" ]
                        [ Html.h2 [ Html.Attributes.class "section-title" ] [ Html.text "Betygsatta Fynd" ]
                        , Html.p [ Html.Attributes.class "section-description" ] [ Html.text "Dessa sällsynta verk har lästs av några få. Varje bok bär spår av tiden och väntar på att återupptäckas." ]
                        , Html.div [ Html.Attributes.class "book-grid" ] (List.map Book.view app.data.ratedBooks)
                        ]
                , if List.isEmpty app.data.unratedBooks then
                    Html.text ""

                  else
                    Html.section [ Html.Attributes.class "section" ]
                        [ Html.h2 [ Html.Attributes.class "section-title" ] [ Html.text "Mysterierna" ]
                        , Html.p [ Html.Attributes.class "section-description" ] [ Html.text "Böcker utan betyg. Deras historia är oklar, men de väntar på att bli utforskade." ]
                        , Html.div [ Html.Attributes.class "book-grid" ] (List.map Book.view app.data.unratedBooks)
                        ]
                , if List.isEmpty app.data.unratedBooks && List.isEmpty app.data.ratedBooks then
                    Html.text <| "Inga böcker hittades för år " ++ app.routeParams.number

                  else
                    Html.text ""
                ]
            ]
        , Html.footer []
            [ Html.div [ Html.Attributes.class "container" ]
                [ Html.p [] [ Html.text "En samling av glömda svenska litterära skatter" ]
                ]
            ]
        ]
    }


pages : BackendTask.BackendTask FatalError.FatalError (List RouteParams)
pages =
    BackendTask.succeed (List.range 1850 2024 |> List.map (\year -> { number = String.fromInt year }))
