module Route.Om exposing (Model, Msg, RouteParams, route, Data, ActionData)

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


type alias PageCountGroup =
    { min : Int, max : Int, count : Int, ofTotal : Float }


type alias Data =
    { pageCountGroups : List PageCountGroup
    , averagePageCount : Int
    , mostAverageBooks : List Book.Book
    , medianPageCount : Int
    , medianPageCountBooks : List Book.Book
    , mostCommonPageCount : { pageCount : Int, amount : Int }
    , mostCommonPageCountBooks : List Book.Book
    }


type alias ActionData =
    BackendTask.BackendTask FatalError.FatalError (List RouteParams)


data : BackendTask.BackendTask FatalError.FatalError Data
data =
    BackendTask.Custom.run "getAboutInfo"
        Json.Encode.null
        (Json.Decode.map7 Data
            (Json.Decode.field "pageCountGroups"
                (Json.Decode.list
                    (Json.Decode.map4 PageCountGroup
                        (Json.Decode.index 0 Json.Decode.int)
                        (Json.Decode.index 1 Json.Decode.int)
                        (Json.Decode.index 2 Json.Decode.int)
                        (Json.Decode.index 3 Json.Decode.float)
                    )
                )
            )
            (Json.Decode.field "averagePageCount" Json.Decode.int)
            (Json.Decode.field "mostAverageBooks" (Json.Decode.list Book.decode))
            (Json.Decode.field "medianPageCount" Json.Decode.int)
            (Json.Decode.field "medianPageCountBooks" (Json.Decode.list Book.decode))
            (Json.Decode.field "mostCommonPageCount"
                (Json.Decode.map2 (\p a -> { pageCount = p, amount = a })
                    (Json.Decode.field "pages" Json.Decode.int)
                    (Json.Decode.field "count" Json.Decode.int)
                )
            )
            (Json.Decode.field "mostCommonPageCountBooks" (Json.Decode.list Book.decode))
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
    { title = "Om"
    , body =
        [ Html.h2 []
            [ Html.text "Om" ]
        , Html.p [] [ Html.text "Denna sida är skapad för att lyfta fram mindre kända svenska skönlitterära originalverk. Främst för att jag själv vill läsa fler svenska originalverk, bortom klassikerna som Strindberg, Selma Lagerlöf, Astrid Lindgren, Stieg Larsson, etc. Att filtrera ut endast svenska skönlitterära originalverk är idag inte är möjligt via Libris eller Gotlibs sökfunktion, då dessa inkluderar böcker som är översatta till svenska." ]
        , Html.section
            []
            [ Html.h2 []
                [ Html.text "Urval" ]
            , Html.p
                []
                ([ Html.text "Urvalet av böcker som visas på"
                 , Html.a [ Html.Attributes.href (Route.toString Route.Index) ] [ Html.text "Boklåda.se" ]
                 , Html.text "är böcker som går att låna eller läsa någonstans i Sverige just nu. Denna information kommer från"
                 , Shared.externalLink "https://libris.kb.se/" "Libris"
                 , Html.text "som är en nationell söktjänst med information om titlar på svenska bibliotek."
                 , Html.br [] []
                 , Html.br [] []
                 , Html.text "Betygen kommer från"
                 , Shared.externalLink "https://www.goodreads.com/" "Goodreads"
                 , Html.text "som är en hemsida där användare kan betygsätta och recensera böcker de läst. Med hjälp av denna data så tar vi bort de mest populära författarna baserat på det summerade antalet recensioner författaren har på Goodreads. För nuvarande tar vi bort 10% av de mest populära författarna och deras böcker."
                 , Html.br [] []
                 , Html.br [] []
                 , Html.text "För att också lyfta upp mer okända författare så visar vi endast böcker av avlidna författare. Detta sker genom att vi antingen får dödsdatum om författaren från Libris, eller i de fallen vi bara får födelsedatum från Libris, så plussar vi på 100 år på födelsedatumet och anser de vara avlidna om detta är äldre än nuvarande år."
                 ]
                    |> List.intersperse (Html.text " ")
                )
            ]
        , Html.section []
            [ Html.h2 []
                [ Html.text "Sidantal" ]
            , Html.p []
                [ Html.text <| "Det vanligaste sidantalet (typvärde) för en bok i samlingen är " ++ String.fromInt app.data.mostCommonPageCount.pageCount ++ " sidor där sammanlagt " ++ String.fromInt app.data.mostCommonPageCount.amount ++ " böcker har det sidantalet. Den genomsnittliga boken är på " ++ String.fromInt app.data.averagePageCount ++ " sidor och medianboken är på " ++ String.fromInt app.data.medianPageCount ++ " sidor."
                , Html.br [] []
                , Html.br [] []
                , Html.text "Antalet böcker per sidantal, grupperat på 100 sidor"
                ]
            , Html.div [ Html.Attributes.class "page-count-graph" ]
                (List.map
                    (\x ->
                        Html.div []
                            [ Html.span [ Html.Attributes.style "white-space" "nowrap" ] [ Html.text <| String.fromInt x.count ]
                            , Html.br [] []
                            , Html.span [ Html.Attributes.style "white-space" "nowrap" ] [ Html.text <| String.fromFloat (roundTo 2 x.ofTotal) ++ "%" ]
                            , Html.div [ Html.Attributes.style "height" (String.fromFloat (x.ofTotal / 100.0 * 500.0) ++ "px") ] []
                            , Html.span [ Html.Attributes.style "white-space" "nowrap" ] [ Html.text <| String.fromInt x.min ++ "-" ++ String.fromInt x.max ]
                            ]
                    )
                    app.data.pageCountGroups
                )
            ]
        , Html.section []
            (case app.data.mostCommonPageCountBooks of
                _ :: _ ->
                    [ Html.h3 [] [ Html.text <| "Dessa böcker har alla det vanligaste sidantalet på " ++ String.fromInt app.data.mostCommonPageCount.pageCount ++ " sidor" ]
                    , BookList.scrollableView { linkToAuthor = True, linkToTitle = True, linkToYear = True } app.data.mostCommonPageCountBooks
                    ]

                [] ->
                    []
            )
        , Html.section
            []
            (case app.data.mostCommonPageCountBooks of
                _ :: _ ->
                    [ Html.h3 [] [ Html.text <| "Dessa böcker har alla median-sidantalet på " ++ String.fromInt app.data.medianPageCount ++ " sidor" ]
                    , BookList.scrollableView { linkToAuthor = True, linkToTitle = True, linkToYear = True } app.data.medianPageCountBooks
                    ]

                [] ->
                    []
            )
        , Html.section []
            (case app.data.mostAverageBooks of
                _ :: _ ->
                    [ Html.h3 [] [ Html.text <| "Dessa böcker har alla exakt det genomsnittliga sidantalet på " ++ String.fromInt app.data.averagePageCount ++ " sidor" ]
                    , BookList.scrollableView { linkToAuthor = True, linkToTitle = True, linkToYear = True } app.data.mostAverageBooks
                    ]

                [] ->
                    []
            )
        ]
    }


roundTo : Int -> Float -> Float
roundTo digits number =
    let
        factor =
            10 ^ digits |> toFloat
    in
    (number * factor |> round |> toFloat) / factor
