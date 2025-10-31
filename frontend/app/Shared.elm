module Shared exposing (Data, Model, Msg(..), SharedMsg(..), externalLink, template)

import BackendTask exposing (BackendTask)
import BackendTask.Custom
import Dict
import Effect exposing (Effect)
import FatalError exposing (FatalError)
import Html exposing (Html)
import Html.Attributes
import Json.Decode
import Json.Encode
import Pages.Flags
import Pages.PageUrl exposing (PageUrl)
import Route exposing (Route)
import SharedTemplate exposing (SharedTemplate)
import UrlPath exposing (UrlPath)
import View exposing (View)


template : SharedTemplate Msg Model Data msg
template =
    { init = init
    , update = update
    , view = view
    , data = data
    , subscriptions = subscriptions
    , onPageChange = Nothing
    }


type Msg
    = SharedMsg SharedMsg
    | MenuClicked


type alias Data =
    { worksPerYear : List ( Int, Int )
    }


type SharedMsg
    = NoOp


type alias Model =
    { showMenu : Bool
    }


init :
    Pages.Flags.Flags
    ->
        Maybe
            { path :
                { path : UrlPath
                , query : Maybe String
                , fragment : Maybe String
                }
            , metadata : route
            , pageUrl : Maybe PageUrl
            }
    -> ( Model, Effect Msg )
init _ _ =
    ( { showMenu = False }
    , Effect.none
    )


update : Msg -> Model -> ( Model, Effect Msg )
update msg model =
    case msg of
        SharedMsg _ ->
            ( model, Effect.none )

        MenuClicked ->
            ( { model | showMenu = not model.showMenu }, Effect.none )


subscriptions : UrlPath -> Model -> Sub Msg
subscriptions _ _ =
    Sub.none


data : BackendTask FatalError Data
data =
    BackendTask.Custom.run "getCountOfTitlesPerYear"
        Json.Encode.null
        (Json.Decode.map Data
            (Json.Decode.list
                (Json.Decode.map2 Tuple.pair
                    (Json.Decode.field "year" Json.Decode.int)
                    (Json.Decode.field "amount" Json.Decode.int)
                )
            )
        )
        |> BackendTask.allowFatal


linkToHomePage : Html msg
linkToHomePage =
    Html.a [ Html.Attributes.class "back", Html.Attributes.href (Route.toString Route.Index) ] [ Html.img [ Html.Attributes.src "/back.svg" ] [] ]


{-| Adds noreferrer and nofollow and opens the link in a new tab
-}
externalLink : List (Html.Attribute msg) -> List (Html.Html msg) -> Html.Html msg
externalLink attributes children =
    Html.a ([ Html.Attributes.target "_blank", Html.Attributes.rel "noreferrer nofollow" ] ++ attributes) children


view :
    Data
    ->
        { path : UrlPath
        , route : Maybe Route
        }
    -> Model
    -> (Msg -> msg)
    -> View msg
    -> { body : List (Html msg), title : String }
view sharedData page _ _ pageView =
    let
        isOnIndexPage =
            Maybe.map ((==) Route.Index) page.route |> Maybe.withDefault False
    in
    { body =
        [ Html.header []
            [ if not isOnIndexPage then
                linkToHomePage

              else
                Html.text ""
            , Html.h1 []
                [ Html.text pageView.title
                ]
            ]
        , Html.main_ []
            [ Html.div [ Html.Attributes.class "container" ]
                (pageView.body
                    ++ [ Html.section [ Html.Attributes.class "section" ]
                            [ Html.h2 [ Html.Attributes.class "section-title" ]
                                [ Html.text "Hitta titlar per år" ]
                            , worksPerYearView sharedData.worksPerYear
                                (case page.route of
                                    Just (Route.Year__Number_ { number }) ->
                                        Just number

                                    _ ->
                                        Nothing
                                )
                            ]
                       ]
                )
            ]
        , Html.footer []
            [ Html.span []
                [ Html.text "Skapad med hjälp av "
                , externalLink
                    [ Html.Attributes.href "https://elm-lang.org/" ]
                    [ Html.text "Elm" ]
                , Html.text " och "
                , externalLink [ Html.Attributes.href "https://elm-pages.com/" ] [ Html.text "elm-pages" ]
                ]
            , externalLink [ Html.Attributes.href "https://github.com/Qluxzz/swedish_books" ] [ Html.text "Källkod" ]
            ]
        ]
    , title = pageView.title
    }


worksPerYearView : List ( Int, Int ) -> Maybe String -> Html.Html msg
worksPerYearView worksPerYear onYear =
    let
        amounts =
            List.map Tuple.second worksPerYear

        onY =
            onYear |> Maybe.andThen String.toInt
    in
    Maybe.map2
        (\min max ->
            Html.div
                [ Html.Attributes.class "works-per-year" ]
                ((worksPerYear
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
