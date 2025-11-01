module Shared exposing (Data, Model, Msg(..), SharedMsg(..), externalLink, template)

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


type Msg
    = SharedMsg SharedMsg
    | MenuClicked


type alias Data =
    ()


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
    BackendTask.succeed ()


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
view _ page _ _ pageView =
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
    , title = pageView.title
    }
