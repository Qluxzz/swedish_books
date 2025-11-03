module PageSelector exposing (..)

import Html
import Html.Attributes
import Route


view : Int -> Int -> ({ sida : String } -> Route.Route) -> Html.Html msg
view currentPage amountOfPages baseUrl =
    Html.div [ Html.Attributes.class "page-selector" ]
        (1
            :: List.range (Basics.max 2 (currentPage - 3)) (Basics.min (amountOfPages - 1) (currentPage + 3))
            ++ [ amountOfPages ]
            |> List.map
                (\page ->
                    if page == currentPage then
                        Html.span [] [ Html.text <| String.fromInt page ]

                    else
                        Html.a
                            [ Html.Attributes.href (Route.toString (baseUrl { sida = String.fromInt page }))
                            ]
                            [ Html.text <| String.fromInt page ]
                )
        )
