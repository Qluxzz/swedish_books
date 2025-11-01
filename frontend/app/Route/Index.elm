module Route.Index exposing (ActionData, Data, Model, Msg, route)

import BackendTask exposing (BackendTask)
import BackendTask.Custom
import Book
import BookList exposing (view)
import FatalError exposing (FatalError)
import Head
import Head.Seo as Seo
import Html
import Html.Attributes
import Json.Decode
import Json.Encode
import LanguageTag.Language
import LanguageTag.Region
import MimeType exposing (MimeText(..))
import Pages.Url
import PagesMsg exposing (PagesMsg)
import Route
import RouteBuilder exposing (App, StatelessRoute)
import Shared
import UrlPath
import View exposing (View)


type alias Model =
    {}


type alias Msg =
    ()


type alias RouteParams =
    {}


type alias Data =
    { ratedBooks : List Book.Book
    , unratedBooks : List Book.Book
    , titlesPerYear : List ( Int, Int )
    }


type alias ActionData =
    {}


route : StatelessRoute RouteParams Data ActionData
route =
    RouteBuilder.single
        { head = head
        , data = data
        }
        |> RouteBuilder.buildNoState { view = view }


data : BackendTask FatalError Data
data =
    BackendTask.Custom.run "getHomePageData"
        Json.Encode.null
        (Json.Decode.map3 Data
            (Json.Decode.field "ratedTitles" (Json.Decode.list Book.decode))
            (Json.Decode.field "unratedTitles" (Json.Decode.list Book.decode))
            (Json.Decode.field "titlesPerYear"
                (Json.Decode.list
                    (Json.Decode.map2 Tuple.pair
                        (Json.Decode.field "year" Json.Decode.int)
                        (Json.Decode.field "amount" Json.Decode.int)
                    )
                )
            )
        )
        |> BackendTask.allowFatal


head :
    App Data ActionData RouteParams
    -> List Head.Tag
head _ =
    Seo.summary
        { canonicalUrlOverride = Nothing
        , siteName = "Mindre kända svenska originalverk"
        , image =
            { url = [ "images", "icon-png.png" ] |> UrlPath.join |> Pages.Url.fromPath
            , alt = "elm-pages logo"
            , dimensions = Nothing
            , mimeType = Nothing
            }
        , description = "Hitta svenska skönlitterära originalverk som många kanske inte känner till"
        , locale = Just ( LanguageTag.Language.sv, LanguageTag.Region.se )
        , title = "Mindre kända svenska originalverk"
        }
        |> Seo.website


view :
    App Data ActionData RouteParams
    -> Shared.Model
    -> View (PagesMsg Msg)
view app _ =
    { title = "Mindre kända svenska originalverk"
    , body =
        BookList.view { linkToAuthor = True, linkToYear = True } app.data.ratedBooks app.data.unratedBooks
            ++ [ Html.section [ Html.Attributes.class "section" ]
                    [ Html.h2 [ Html.Attributes.class "section-title" ]
                        [ Html.text "Hitta titlar per år" ]
                    , Html.p [ Html.Attributes.class "section-description" ] []
                    , titlesPerYearView app.data.titlesPerYear Nothing
                    ]
               ]
    }


titlesPerYearView : List ( Int, Int ) -> Maybe String -> Html.Html msg
titlesPerYearView titlesPerYear onYear =
    let
        amounts =
            List.map Tuple.second titlesPerYear

        onY =
            onYear |> Maybe.andThen String.toInt
    in
    Maybe.map2
        (\min max ->
            Html.div
                [ Html.Attributes.class "works-per-year" ]
                ((titlesPerYear
                    |> List.map
                        (\( year, amount ) ->
                            let
                                normalized =
                                    (toFloat amount - min) / (max - min)

                                fontSize =
                                    1 + normalized

                                opacity =
                                    normalized * 80 + 20
                            in
                            Html.a
                                ([ Html.Attributes.style "font-size" (String.fromFloat fontSize ++ "em")
                                 , Html.Attributes.style "opacity" (String.fromFloat opacity ++ "%")
                                 ]
                                    ++ (if Just year /= onY then
                                            [ Html.Attributes.href (Route.toString (Route.Year__Number_ { number = String.fromInt year })) ]

                                        else
                                            []
                                       )
                                )
                                [ Html.text <| String.fromInt year ++ " (" ++ String.fromInt amount ++ ")" ]
                        )
                 )
                    -- This makes sure the last row doesn't have large holes between
                    -- the items if fewer than a full row was left by forcing it to left align
                    ++ [ Html.div [ Html.Attributes.style "flex-grow" "1" ] [] ]
                )
        )
        (List.minimum amounts |> Maybe.map toFloat)
        (List.maximum amounts |> Maybe.map toFloat)
        |> Maybe.withDefault (Html.text "")
