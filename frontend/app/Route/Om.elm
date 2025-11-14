module Route.Om exposing (Model, Msg, RouteParams, route, Data, ActionData)

{-|

@docs Model, Msg, RouteParams, route, Data, ActionData

-}

import BackendTask
import FatalError
import Head
import Html
import Html.Attributes
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
    {}


type alias ActionData =
    BackendTask.BackendTask FatalError.FatalError (List RouteParams)


data : BackendTask.BackendTask FatalError.FatalError Data
data =
    BackendTask.succeed {}


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
        , Html.section
            []
            [ Html.h3 []
                [ Html.text "Urval" ]
            , Html.p
                []
                ([ Html.text "Urvalet av böcker som visas på"
                 , Html.a [ Html.Attributes.href (Route.toString Route.Index) ] [ Html.text "Boklåda.se" ]
                 , Html.text "är böcker som går att låna någonstans i Sverige just nu. Denna information kommer från"
                 , Html.a [ Html.Attributes.href "https://libris.kb.se/" ] [ Html.text "Libris" ]
                 , Html.text "som är en nationell söktjänst med information om titlar på svenska bibliotek. Betygen kommer från"
                 , Html.a [ Html.Attributes.href "https://www.goodreads.com/" ] [ Html.text "Goodreads" ]
                 , Html.text "som är en hemsida där användare kan betygsätta och recensera böcker de läst. Med hjälp av denna data så tar vi bort de mest populära författarna baserat på det summerade antalet recensioner författaren har på Goodreads. För nuvarande tar vi bort de topp 10% av de mest populära författarna och deras böcker."
                 , Html.text "För att också lyfta upp mer okända författare så visar vi endast böcker av framlidna författare. Detta sker genom att vi antingen får dödsdatum om författaren från Libris, eller om vi bara får födelsedatum från Libris, så plussar vi på 100 år och anser de vara avlidna om detta är äldre än nuvarande år."
                 ]
                    |> List.intersperse (Html.text " ")
                )
            ]
        ]
    }
