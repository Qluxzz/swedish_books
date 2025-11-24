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
externalLink : String -> String -> Html msg
externalLink href title =
    Html.a [ Html.Attributes.target "_blank", Html.Attributes.rel "noreferrer nofollow", Html.Attributes.href href ] [ Html.text title ]


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
            , Html.a [ Html.Attributes.href (Route.toString Route.Om) ]
                [ Html.text "Om"
                ]
            ]
        , Html.main_ []
            [ Html.div [ Html.Attributes.class "container" ]
                pageView.body
            ]
        , Html.footer []
            [ Html.span []
                [ Html.text "Skapad med hjälp av "
                , externalLink "https://elm-lang.org/" "Elm"
                , Html.text " och "
                , externalLink "https://elm-pages.com/" "elm-pages"
                ]
            , externalLink "https://github.com/Qluxzz/swedish_books" "Källkod"
            ]
        ]
    , title = "Boklåda.se | " ++ pageView.title
    }
