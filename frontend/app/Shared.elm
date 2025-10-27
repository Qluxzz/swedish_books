module Shared exposing (Data, Model, Msg(..), SharedMsg(..), template)

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
    { worksPerYear : Dict.Dict String Int
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
    (BackendTask.Custom.run "getCountOfTitlesPerYear"
        Json.Encode.null
        (Json.Decode.dict Json.Decode.int)
        |> BackendTask.allowFatal
    )
        |> BackendTask.map (\dict -> { worksPerYear = dict })


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
    { body =
        [ Html.header []
            [ Html.h1 []
                [ Html.text <|
                    case page.route of
                        Just (Route.Year__Number_ { number }) ->
                            "Böcker för år " ++ number

                        _ ->
                            "Gömda böcker"
                ]
            , Html.p [] [ Html.text "Svenska verk från bibliotekets magasin" ]
            ]
        , Html.main_ []
            [ Html.div [ Html.Attributes.class "container" ]
                (pageView.body
                    ++ [ Html.section [ Html.Attributes.class "section" ]
                            [ Html.h2 [ Html.Attributes.class "section-title" ]
                                [ Html.text "Hitta titlar per år" ]
                            , Html.div [ Html.Attributes.class "works-per-year" ]
                                (sharedData.worksPerYear
                                    |> Dict.toList
                                    |> List.reverse
                                    |> List.map
                                        (\( year, amount ) -> Html.a [ Html.Attributes.href (Route.toString (Route.Year__Number_ { number = year })) ] [ Html.text <| year ++ " (" ++ String.fromInt amount ++ ")" ])
                                )
                            ]
                       ]
                )
            ]
        , Html.footer []
            [ Html.div [ Html.Attributes.class "container" ]
                [ Html.p [] [ Html.text "En samling av glömda svenska litterära skatter" ]
                ]
            ]
        ]
    , title = pageView.title
    }
