module Route.Forfattare.Bokstav_ exposing (Model, Msg, RouteParams, route, Data, ActionData)

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
import Url
import View


type alias Model =
    {}


type alias Msg =
    ()


type alias RouteParams =
    { bokstav : String }


route : RouteBuilder.StatelessRoute RouteParams Data ActionData
route =
    RouteBuilder.preRender
        { data = data, pages = pages, head = head }
        |> RouteBuilder.buildNoState
            { view = view }


type alias Author =
    { id : Int
    , name : String
    , slug : String
    , books : List Book.Book
    , lifeSpan : Maybe String
    }


type alias Data =
    { authors : List Author }


type alias ActionData =
    BackendTask.BackendTask FatalError.FatalError (List RouteParams)


data : RouteParams -> BackendTask.BackendTask FatalError.FatalError Data
data routeParams =
    BackendTask.Custom.run "getAuthorsByLetter"
        (Json.Encode.string (Url.percentDecode routeParams.bokstav |> Maybe.withDefault ""))
        (Json.Decode.map Data
            (Json.Decode.list
                (Json.Decode.map5 Author
                    (Json.Decode.field "id" Json.Decode.int)
                    (Json.Decode.field "name" Json.Decode.string)
                    (Json.Decode.field "slug" Json.Decode.string)
                    (Json.Decode.field "books" (Json.Decode.list Book.decode))
                    (Json.Decode.maybe (Json.Decode.field "life_span" Json.Decode.string))
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
    { title = "Författare på " ++ (Url.percentDecode app.routeParams.bokstav |> Maybe.withDefault "") ++ " (" ++ String.fromInt (List.length app.data.authors) ++ ")"
    , body =
        [ Html.section [ Html.Attributes.class "authors" ]
            (app.data.authors
                |> List.map
                    (\a ->
                        Html.section []
                            [ Html.a [ Html.Attributes.href (Route.toString (Route.Forfattare__Id___Namn_ { id = String.fromInt a.id, namn = a.slug })) ] [ Html.text <| a.name ++ " (" ++ String.fromInt (List.length a.books) ++ ")" ]
                            , Html.div [ Html.Attributes.class "book-grid" ] (List.map (Book.view { linkToAuthor = True, linkToYear = True }) a.books)
                            ]
                    )
            )
        ]
    }


pages : BackendTask.BackendTask FatalError.FatalError (List RouteParams)
pages =
    BackendTask.Custom.run "getCountOfAuthorsByStartingFamilyNameLetter"
        Json.Encode.null
        (Json.Decode.map (List.map (\y -> { bokstav = y }))
            (Json.Decode.list
                (Json.Decode.field "char" Json.Decode.string
                    |> Json.Decode.andThen
                        (\s ->
                            case String.uncons s of
                                Just ( c, _ ) ->
                                    Json.Decode.succeed (Url.percentEncode (String.fromChar c))

                                Nothing ->
                                    Json.Decode.fail "Expected a non-empty string for 'char'"
                        )
                )
            )
        )
        |> BackendTask.allowFatal
