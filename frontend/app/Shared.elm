module Shared exposing (Data, Model, Msg, SharedMsg(..), externalLink, template)

import BackendTask exposing (BackendTask)
import Effect exposing (Effect)
import FatalError exposing (FatalError)
import Html exposing (Html)
import Html.Attributes
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


type alias Msg =
    ()


type alias Data =
    ()


type SharedMsg
    = NoOp


type alias Model =
    ()


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
    ( ()
    , Effect.none
    )


update : Msg -> Model -> ( Model, Effect Msg )
update msg model =
    ( (), Effect.none )


subscriptions : UrlPath -> Model -> Sub Msg
subscriptions _ _ =
    Sub.none


data : BackendTask FatalError Data
data =
    BackendTask.succeed ()


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
view _ _ _ _ pageView =
    { body =
        [ Html.header []
            [ Html.a [ Html.Attributes.href (Route.toString Route.Index) ]
                [ Html.h1 []
                    [ Html.text "Boklåda.se"
                    ]
                ]
            ]
        , Html.main_ []
            [ Html.div [ Html.Attributes.class "container" ]
                pageView.body
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
    , title = "Boklåda.se | " ++ pageView.title
    }
